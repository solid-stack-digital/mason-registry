import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { IOtpEmailGateway } from "../domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import type { Otp } from "../domain/Otp.js";

export type SendEmailOtpInput = {
	recipientid?: string | undefined;
	recipientId?: string | undefined;
	recipientemail?: string | undefined;
	recipientEmail?: string | undefined;
	email?: string | undefined;
	purpose?: string | undefined;
};

export type SendEmailOtpOutput = {
	otpId: string;
	expiresAt: string;
};

@MakeInjectable
export class SendEmailOtp {
	public static deps = {
		otpRepo: IOtpRepo,
		otpGenerator: IOtpGenerator,
		emailGateway: IOtpEmailGateway,
		uuid: Uuid,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof SendEmailOtp.deps>) {}

	async execute(props: SendEmailOtpInput): Promise<SendEmailOtpOutput> {
		const recipientId =
			props.recipientid ||
			props.recipientId ||
			props.email ||
			props.recipientEmail ||
			props.recipientemail;
		const recipientEmail =
			props.recipientemail || props.recipientEmail || props.email;
		const purpose = props.purpose || "EMAIL_VERIFICATION";

		if (!recipientId || !recipientEmail) {
			throw new Error("recipientId and recipientEmail are required");
		}

		const existing = await this.deps.otpRepo.findLatestByRecipientAndPurpose(
			recipientId,
			purpose,
		);

		const now = this.deps.clock.now();
		if (existing && !existing.isUsed) {
			if (now.isBefore(existing.expiresAt) && existing.attempts < 3) {
				throw new Error(
					`An active unexpired OTP already exists for recipient ${recipientId} and purpose ${purpose}`,
				);
			}
		}

		const otpCode = this.deps.otpGenerator.generate();
		const id = this.deps.uuid.generate();
		const expiryDuration = this.deps.clock.duration("5m");
		const expiresAt = now.plus(expiryDuration);
		const expiresAtIso = this.deps.clock.toIso(expiresAt);

		const otp: Otp = {
			id,
			recipientId,
			recipientEmail,
			purpose,
			otpCode,
			attempts: 0,
			isUsed: false,
			expiresAt,
			createdAt: now,
			updatedAt: now,
		};

		// Send email first
		await this.deps.emailGateway.sendEmail({
			to: recipientEmail,
			subject: `Your verification code: ${otpCode}`,
			body: `Your One-Time Password is ${otpCode}. It will expire in 5 minutes.`,
		});

		await this.deps.otpRepo.save(otp);

		return {
			otpId: otp.id,
			expiresAt: expiresAtIso,
		};
	}
}
