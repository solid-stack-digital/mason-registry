import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";

export type ValidateOtpInput = {
	recipientId?: string | undefined;
	recipientid?: string | undefined;
	email?: string | undefined;
	purpose?: string | undefined;
	otp?: string | undefined;
	code?: string | undefined;
	otpCode?: string | undefined;
};

export type ValidateOtpOutput = {
	valid: boolean;
};

@MakeInjectable
export class ValidateOtp {
	public static deps = {
		otpRepo: IOtpRepo,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof ValidateOtp.deps>) {}

	async execute(props: ValidateOtpInput): Promise<ValidateOtpOutput> {
		const recipientId = props.recipientId || props.recipientid || props.email;
		const purpose = props.purpose || "EMAIL_VERIFICATION";
		const otpCode = props.otp || props.code || props.otpCode;

		if (!recipientId || !otpCode) {
			throw new Error("recipientId and otp code are required");
		}

		const existing = await this.deps.otpRepo.findLatestByRecipientAndPurpose(
			recipientId,
			purpose,
		);

		if (!existing) {
			throw new Error(
				`Invalid OTP or no OTP found for recipient and purpose: ${purpose}`,
			);
		}

		if (existing.isUsed) {
			throw new Error("OTP has already been used");
		}

		const now = this.deps.clock.now();
		if (now.isAfter(existing.expiresAt) || now.isEqual(existing.expiresAt)) {
			throw new Error("OTP has expired");
		}

		if (existing.attempts >= 3) {
			throw new Error("Maximum OTP verification attempts exceeded");
		}

		if (existing.otpCode !== otpCode) {
			existing.attempts += 1;
			existing.updatedAt = now;
			await this.deps.otpRepo.update(existing);
			throw new Error("Invalid OTP code");
		}

		existing.isUsed = true;
		existing.updatedAt = now;
		await this.deps.otpRepo.update(existing);

		return { valid: true };
	}
}
