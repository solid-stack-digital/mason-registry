import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import {
	OtpExpiredError,
	OtpInvalidCodeError,
	OtpMaxAttemptsExceededError,
	OtpNotFoundError,
} from "../domain/errors/OtpErrors.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import { DEFAULT_OTP_CONFIG, toMillis } from "../domain/OtpConfig.js";
import { OtpConfigToken } from "../tokens.js";

export interface ValidateOtpInput {
	recipientId?: string | undefined;
	recipientid?: string | undefined;
	email?: string | undefined;
	purpose?: string | undefined;
	otp?: string | undefined;
	code?: string | undefined;
	otpCode?: string | undefined;
}

export type ValidateOtpOutput = boolean;

@MakeInjectable
export class ValidateOtp {
	public static deps = {
		otpRepo: IOtpRepo,
		clock: Clock,
		otpConfig: OtpConfigToken,
	};

	constructor(public deps: DepsType<typeof ValidateOtp.deps>) {}

	async execute(props: ValidateOtpInput): Promise<boolean> {
		const recipientId = props.recipientId || props.recipientid || props.email;
		const purpose = props.purpose || "EMAIL_VERIFICATION";
		const otpCode = props.otp || props.code || props.otpCode;

		if (!recipientId || !otpCode) {
			throw new Error("recipientId and otp code are required");
		}

		const config = this.deps.otpConfig || DEFAULT_OTP_CONFIG;
		const now = this.deps.clock.now();

		const existing = await this.deps.otpRepo.findLatestByRecipientAndPurpose(
			recipientId,
			purpose,
		);

		// If no record exists at all
		if (!existing) {
			throw new OtpNotFoundError("Invalid code");
		}

		// Hasactive = id+purpose combo already has active otp and younger than configs.otpTtl
		const isExpired =
			now.isAfter(existing.expiresAt) ||
			now.isEqual(existing.expiresAt) ||
			now.millis - existing.createdAt.millis >= toMillis(config.otpTtl);

		// If expired, prioritize the explicit message per Expected Behavior 3
		if (isExpired) {
			throw new OtpExpiredError("Code expired, please request a new one");
		}

		// If already exceeded max attempts or was invalidated due to attempts
		if (existing.attempts >= config.maxAttempts) {
			throw new OtpMaxAttemptsExceededError(
				"Too many failed attempts. This code has been invalidated.",
			);
		}

		// If already used or invalidated (e.g. burned by generating a newer code)
		if (existing.isUsed || existing.isInvalidated) {
			throw new OtpInvalidCodeError("Invalid code");
		}

		// 4. If otp wrong:
		if (existing.otpCode !== otpCode) {
			existing.attempts += 1;
			existing.updatedAt = now;

			if (existing.attempts >= config.maxAttempts) {
				existing.isInvalidated = true;
				await this.deps.otpRepo.update(existing);
				throw new OtpMaxAttemptsExceededError(
					"Too many failed attempts. This code has been invalidated.",
				);
			}

			await this.deps.otpRepo.update(existing);
			throw new OtpInvalidCodeError("Invalid code");
		}

		// 5. Mark otp as used (making it inactive)
		existing.isUsed = true;
		existing.updatedAt = now;
		await this.deps.otpRepo.update(existing);

		// 6. Return true as success
		return true;
	}
}
