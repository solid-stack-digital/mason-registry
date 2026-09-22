import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { DEFAULT_AUTHN_CONFIG, toDuration } from "../domain/AuthnConfig.js";
import {
	AccountNotVerifiedError,
	InvalidCredentialsError,
} from "../domain/errors/AuthnErrors.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import type { RefreshToken } from "../domain/RefreshToken.js";
import { AuthnConfigToken } from "../tokens.js";

export type LoginInput = {
	clientDeviceId: string;
	email: string;
	password: string;
};

export type LoginOutput = {
	accessToken: string;
	refreshToken: string;
	credentialId: string;
};

@MakeInjectable
export class Login {
	public static deps = {
		credRepo: ICredentialRepo,
		refreshTokenRepo: IRefreshTokenRepo,
		hasher: Hasher,
		jwt: Jwt,
		uuid: Uuid,
		clock: Clock,
		authnConfig: AuthnConfigToken,
	};

	constructor(public deps: DepsType<typeof Login.deps>) {}

	async execute(props: LoginInput): Promise<LoginOutput> {
		if (!props.email || typeof props.email !== "string") {
			throw new InvalidCredentialsError("Invalid email or password");
		}

		const email = props.email.trim().toLowerCase();
		const cred = await this.deps.credRepo.findByEmail(email);
		if (!cred) {
			throw new InvalidCredentialsError("Invalid email or password");
		}

		if (!cred.isVerified) {
			throw new AccountNotVerifiedError(
				"Email has not been verified. Please verify your email before logging in",
			);
		}

		const isMatch = await this.deps.hasher.verify(
			props.password,
			cred.passwordHash,
		);
		if (!isMatch) {
			throw new InvalidCredentialsError("Invalid email or password");
		}

		const clientDeviceId = props.clientDeviceId?.trim() || "default-device";

		// Invalidate and delete all refresh token with deviceId, credential id
		await this.deps.refreshTokenRepo.deleteByCredentialAndDevice(
			cred.id,
			clientDeviceId,
		);

		// Resolve TTL from config
		const config = this.deps.authnConfig ?? DEFAULT_AUTHN_CONFIG;
		const accessTtl = toDuration(config.accessTokenTtl);
		const refreshTtl = toDuration(config.refreshTokenTtl);

		const refreshTokenId = this.deps.uuid.generate();

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
					jti: refreshTokenId,
					tokenId: refreshTokenId,
					type: "refresh",
				},
				{ ttl: refreshTtl },
			),
		]);

		const now = this.deps.clock.now();
		const expiresAt = now.plus(refreshTtl);

		const refreshTokenRecord: RefreshToken = {
			id: refreshTokenId,
			jti: refreshTokenId,
			credentialId: cred.id,
			clientDeviceId,
			token: refreshToken,
			isRevoked: false,
			expiresAt,
			createdAt: now,
			updatedAt: now,
		};

		await this.deps.refreshTokenRepo.save(refreshTokenRecord);

		return {
			accessToken,
			refreshToken,
			credentialId: cred.id,
		};
	}
}
