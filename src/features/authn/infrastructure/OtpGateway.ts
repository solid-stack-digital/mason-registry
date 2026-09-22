import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { SendOtp } from "@/features/otp/useCases/SendOtp.js";
import { ValidateOtp } from "@/features/otp/useCases/ValidateOtp.js";
import type {
	IOtpGateway,
	SendOtpVerificationPayload,
	ValidateOtpVerificationPayload,
} from "../domain/IOtpGateway.js";

/**
 * Infrastructure adapter implementing IOtpGateway.
 * Bridges authn to the OTP feature via its use cases.
 */
@MakeInjectable
export class OtpGateway implements IOtpGateway {
	public static deps = {
		sendOtp: SendOtp,
		validateOtp: ValidateOtp,
	};

	constructor(public deps: DepsType<typeof OtpGateway.deps>) {}

	async sendVerificationOtp(
		payload: SendOtpVerificationPayload,
	): Promise<void> {
		await this.deps.sendOtp.execute({
			recipientId: payload.recipientId,
			recipientEmail: payload.email,
			purpose: payload.purpose,
			mode: "email",
		});
	}

	async validateOtp(
		payload: ValidateOtpVerificationPayload,
	): Promise<{ valid: boolean }> {
		const valid = await this.deps.validateOtp.execute({
			recipientid: payload.recipientId,
			code: payload.code,
			purpose: payload.purpose,
		});
		return { valid: Boolean(valid) };
	}
}
