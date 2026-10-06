import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { EmailAccessConfigToken } from "../configs/EmailAccessConfigToken.js";
import type { EmailAccess } from "../domain/EmailAccess.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";
import { EmailAccessVerificationError } from "../errors/EmailAccessVerificationError.js";

export interface ValidateEmailAccessInput {
	email: string;
	purpose: string;
	code: string;
}

export interface ValidateEmailAccessOutput {
	emailAccessJwt: string;
}

@MakeInjectable
export class ValidateEmailAccess {
	public static deps = {
		otpGateway: IOtpGateway,
		emailAccessRepo: IEmailAccessRepository,
		jwt: Jwt,
		uuid: Uuid,
		clock: Clock,
		config: EmailAccessConfigToken,
	};

	constructor(public deps: DepsType<typeof ValidateEmailAccess.deps>) {}

	async execute(
		props: ValidateEmailAccessInput,
	): Promise<ValidateEmailAccessOutput> {
		if (
			!props.email ||
			typeof props.email !== "string" ||
			props.email.trim() === ""
		) {
			throw new EmailAccessVerificationError("Email is required");
		}
		if (
			!props.purpose ||
			typeof props.purpose !== "string" ||
			props.purpose.trim() === ""
		) {
			throw new EmailAccessVerificationError("Purpose is required");
		}
		if (
			!props.code ||
			typeof props.code !== "string" ||
			props.code.trim() === ""
		) {
			throw new EmailAccessVerificationError("Code is required");
		}

		const email = props.email.trim().toLowerCase();
		const purpose = props.purpose.trim();
		const code = props.code.trim();

		// 1. Try otp.validateotp
		// If failed: Determine reason and throw according to the reason
		const isValid = await this.deps.otpGateway.validateOtp({
			recipientId: email,
			purpose,
			otp: code,
		});
		if (!isValid) {
			throw new EmailAccessVerificationError("Invalid OTP code");
		}

		// 2. Generate access jwt (email, purpose) with ttl = configs.jwtTtl
		const config = this.deps.config;
		const ttl = this.deps.clock.durationMillis(config.jwtTtl);
		const jti = this.deps.uuid.generate();

		const token = await this.deps.jwt.sign(
			{
				jti,
				email,
				purpose,
			},
			{ ttl },
		);

		// 3. Save jti into repository along with email, purpose, isUsed, expiration
		const now = this.deps.clock.now();
		const expiresAt = now.plus(ttl);
		const id = this.deps.uuid.generate();

		const emailAccess: EmailAccess = {
			id,
			jti,
			email,
			purpose,
			isUsed: false,
			isInvalidated: false,
			expiresAt,
			createdAt: now,
			updatedAt: now,
		};

		await this.deps.emailAccessRepo.save(emailAccess);

		// 4. Return access jwt
		return {
			emailAccessJwt: token,
		};
	}
}
