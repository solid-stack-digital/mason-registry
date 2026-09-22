import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { OtpCooldownError } from "../domain/errors/OtpErrors.js";
import { IOtpEmailGateway } from "../domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import type { Otp } from "../domain/Otp.js";
import { DEFAULT_OTP_CONFIG, toMillis } from "../domain/OtpConfig.js";
import { OtpConfigToken } from "../tokens.js";

export type SendOtpMode = "email";

export interface SendOtpInput {
	recipientid?: string | undefined;
	recipientId?: string | undefined;
	recipientemail?: string | undefined;
	recipientEmail?: string | undefined;
	email?: string | undefined;
	purpose?: string | undefined;
	mode?: SendOtpMode | undefined;
}

export interface SendOtpOutput {
	otpId: string;
	expiresAt: string;
	otpCode?: string | undefined;
}

@MakeInjectable
export class SendOtp {
	public static deps = {
		otpRepo: IOtpRepo,
		otpGenerator: IOtpGenerator,
		emailGateway: IOtpEmailGateway,
		uuid: Uuid,
		clock: Clock,
		otpConfig: OtpConfigToken,
	};

	constructor(public deps: DepsType<typeof SendOtp.deps>) {}

	async execute(props: SendOtpInput): Promise<SendOtpOutput> {
		const recipientId = props.recipientid || props.recipientId;
		const recipientEmail =
			props.recipientemail || props.recipientEmail || props.email;
		const purpose = props.purpose || "EMAIL_VERIFICATION";
		const mode = props.mode || "email";

		if (!recipientId) {
			throw new Error("recipientId is required");
		}
		if (mode === "email" && !recipientEmail) {
			throw new Error("recipientEmail is required for email mode");
		}
		if (mode !== "email") {
			throw new Error(`Unsupported OTP mode: ${mode}`);
		}

		const config = this.deps.otpConfig || DEFAULT_OTP_CONFIG;
		const now = this.deps.clock.now();

		const existing = await this.deps.otpRepo.findLatestByRecipientAndPurpose(
			recipientId,
			purpose,
		);

		// Hasactive = id+purpose combo already has active otp and younger than configs.otpTtl
		const hasActive =
			existing !== null &&
			!existing.isUsed &&
			!existing.isInvalidated &&
			now.isBefore(existing.expiresAt) &&
			existing.attempts < config.maxAttempts;

		if (hasActive) {
			// Cooldown = hasactive and sent within last configs.retryInterval
			const elapsed = now.millis - existing.createdAt.millis;
			const isCooldown = elapsed < toMillis(config.retryInterval);

			if (isCooldown) {
				throw new OtpCooldownError(
					"Please wait before requesting another OTP. Retry cooldown is in effect.",
				);
			}

			// Invalidate existing
			existing.isInvalidated = true;
			existing.updatedAt = now;
			await this.deps.otpRepo.update(existing);
		}

		// Create otp
		const otpCode = this.deps.otpGenerator.generate();
		const id = this.deps.uuid.generate();
		const ttlDuration = Duration.fromMillis(toMillis(config.otpTtl));
		const expiresAt = now.plus(ttlDuration);
		const expiresAtIso = this.deps.clock.toIso(expiresAt);

		const newOtp: Otp = {
			id,
			recipientId,
			recipientEmail: recipientEmail ?? "",
			purpose,
			otpCode,
			attempts: 0,
			isUsed: false,
			isInvalidated: false,
			expiresAt,
			createdAt: now,
			updatedAt: now,
		};

		// If mode === "email": send via emailGateway
		if (mode === "email" && recipientEmail) {
			await this.deps.emailGateway.sendEmail({
				to: recipientEmail,
				subject: `Your verification code: ${otpCode}`,
				body: `Your One-Time Password is ${otpCode}. It will expire in ${Math.round(toMillis(config.otpTtl) / 60000)} minutes.`,
			});
		}

		await this.deps.otpRepo.save(newOtp);

		return {
			otpId: newOtp.id,
			expiresAt: expiresAtIso,
			otpCode: newOtp.otpCode,
		};
	}
}
