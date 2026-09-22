import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { DEFAULT_AUTHN_CONFIG, toDuration } from "../domain/AuthnConfig.js";
import {
	AccountNotFoundError,
	DeviceMismatchError,
	RefreshTokenExpiredError,
	RefreshTokenNotFoundError,
} from "../domain/errors/AuthnErrors.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import type { RefreshToken } from "../domain/RefreshToken.js";
import { AuthnConfigToken } from "../tokens.js";

export type RefreshInput = {
	refreshToken: string;
	clientDeviceId: string;
};

export type RefreshOutput = {
	accessToken: string;
	refreshToken: string;
};

@MakeInjectable
export class Refresh {
	public static deps = {
		credRepo: ICredentialRepo,
		refreshTokenRepo: IRefreshTokenRepo,
		jwt: Jwt,
		uuid: Uuid,
		clock: Clock,
		authnConfig: AuthnConfigToken,
	};

	constructor(public deps: DepsType<typeof Refresh.deps>) {}

	async execute(props: RefreshInput): Promise<RefreshOutput> {
		if (!props.refreshToken || typeof props.refreshToken !== "string") {
			throw new RefreshTokenNotFoundError("Refresh token is required");
		}

		const storedToken = await this.deps.refreshTokenRepo.findByToken(
			props.refreshToken,
		);
		if (!storedToken) {
			throw new RefreshTokenNotFoundError(
				"Invalid or unrecognized refresh token",
			);
		}

		const now = this.deps.clock.now();
		const expTime = storedToken.expiresAt;
		if (now.isAfter(expTime) || now.isEqual(expTime)) {
			throw new RefreshTokenExpiredError("Refresh token has expired");
		}

		const clientDeviceId = props.clientDeviceId?.trim();
		if (storedToken.clientDeviceId !== clientDeviceId) {
			throw new DeviceMismatchError(
				"Client device ID does not match the token's bound device",
			);
		}

		const cred = await this.deps.credRepo.findById(storedToken.credentialId);
		if (!cred) {
			throw new AccountNotFoundError("Associated credential not found");
		}

		// Delete the session for refresh token
		await this.deps.refreshTokenRepo.deleteByToken(storedToken.token);

		// Generate new access and refresh token
		const config = this.deps.authnConfig ?? DEFAULT_AUTHN_CONFIG;
		const accessTtl = toDuration(config.accessTokenTtl);
		const refreshTtl = toDuration(config.refreshTokenTtl);

		const newTokenId = this.deps.uuid.generate();
		const newRefreshExpiresAt = now.plus(refreshTtl);

		const [accessToken, refreshToken] = await Promise.all([
			this.deps.jwt.sign(
				{
					credentialId: cred.id,
					email: cred.email,
					type: "access",
				},
				{ ttl: accessTtl },
			),
			this.deps.jwt.sign(
				{
					credentialId: cred.id,
					clientDeviceId,
					jti: newTokenId,
					tokenId: newTokenId,
					type: "refresh",
				},
				{ ttl: refreshTtl },
			),
		]);

		const newRefreshTokenRecord: RefreshToken = {
			id: newTokenId,
			jti: newTokenId,
			credentialId: cred.id,
			clientDeviceId,
			token: refreshToken,
			isRevoked: false,
			expiresAt: newRefreshExpiresAt,
			createdAt: now,
			updatedAt: now,
		};

		await this.deps.refreshTokenRepo.save(newRefreshTokenRecord);

		return {
			accessToken,
			refreshToken,
		};
	}
}
