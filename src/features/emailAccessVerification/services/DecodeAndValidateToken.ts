import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { TokenExpiredError } from "@/shared/jwt/errors/TokenExpiredError.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import type { DecodedEmailAccessPayload } from "../domain/EmailAccess.js";
import {
	EmailAccessPurposeMismatchError,
	EmailAccessTokenAlreadyUsedError,
	EmailAccessTokenExpiredError,
	EmailAccessTokenInvalidatedError,
	EmailAccessTokenInvalidError,
	EmailAccessTokenNotFoundError,
} from "../domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";

export interface DecodeAndValidateTokenInput {
	token: string;
	purpose: string;
}

@MakeInjectable
export class DecodeAndValidateToken {
	public static deps = {
		jwt: Jwt,
		clock: Clock,
		emailAccessRepo: IEmailAccessRepository,
	};

	constructor(public deps: DepsType<typeof DecodeAndValidateToken.deps>) {}

	async execute(
		propsOrToken: DecodeAndValidateTokenInput | string,
		maybePurpose?: string,
	): Promise<DecodedEmailAccessPayload> {
		const token =
			typeof propsOrToken === "string" ? propsOrToken : propsOrToken.token;
		const purpose =
			typeof propsOrToken === "string"
				? (maybePurpose ?? "")
				: propsOrToken.purpose;

		if (!token || typeof token !== "string" || token.trim() === "") {
			throw new EmailAccessTokenInvalidError("Token is required");
		}
		if (!purpose || typeof purpose !== "string" || purpose.trim() === "") {
			throw new EmailAccessPurposeMismatchError("Purpose is required");
		}

		// 1. Decode token and extract email + purpose
		let payload: DecodedEmailAccessPayload;
		try {
			payload = await this.deps.jwt.verify<DecodedEmailAccessPayload>(token);
		} catch (error) {
			if (
				error instanceof TokenExpiredError ||
				(error as Error)?.name === "TokenExpiredError"
			) {
				throw new EmailAccessTokenExpiredError(
					"Email access token has expired",
				);
			}
			throw new EmailAccessTokenInvalidError("Invalid email access token");
		}

		if (
			!payload ||
			typeof payload !== "object" ||
			!payload.email ||
			!payload.purpose ||
			!payload.jti
		) {
			throw new EmailAccessTokenInvalidError(
				"Invalid email access token payload",
			);
		}

		// 2. Check if token expired. Throw if yes
		if (typeof payload.exp === "number") {
			const nowSec = Math.floor(this.deps.clock.now().millis / 1000);
			if (nowSec >= payload.exp) {
				throw new EmailAccessTokenExpiredError(
					"Email access token has expired",
				);
			}
		}

		// 3. Check if purpose matches purpose passed. Throw if not
		if (payload.purpose !== purpose) {
			throw new EmailAccessPurposeMismatchError(
				`Token purpose '${payload.purpose}' does not match expected purpose '${purpose}'`,
			);
		}

		// 4. Check repo if token with email + purpose exists and if it is valid and if it is not used. Throw if not.
		const record = await this.deps.emailAccessRepo.findByJti(payload.jti);
		if (!record) {
			throw new EmailAccessTokenNotFoundError("Email access token not found");
		}

		if (record.email !== payload.email || record.purpose !== payload.purpose) {
			throw new EmailAccessTokenInvalidError(
				"Token record does not match token email and purpose",
			);
		}

		const now = this.deps.clock.now();
		if (now.isAfter(record.expiresAt)) {
			throw new EmailAccessTokenExpiredError("Email access token has expired");
		}

		if (record.isUsed) {
			throw new EmailAccessTokenAlreadyUsedError(
				"Email access token has already been used",
			);
		}

		if (record.isInvalidated) {
			throw new EmailAccessTokenInvalidatedError(
				"Email access token has been invalidated",
			);
		}

		// 5. Return decoded
		return payload;
	}
}
