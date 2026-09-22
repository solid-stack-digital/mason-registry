import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { SendEmailOtp } from "@/features/otp/useCases/SendEmailOtp.js";
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
		sendEmailOtp: SendEmailOtp,
		validateOtp: ValidateOtp,
	};

	constructor(public deps: DepsType<typeof OtpGateway.deps>) {}

	async sendVerificationOtp(
		payload: SendOtpVerificationPayload,
	): Promise<void> {
		await this.deps.sendEmailOtp.execute({
			recipientid: payload.recipientId,
			recipientemail: payload.email,
			purpose: payload.purpose,
		});
	}

	async validateOtp(
		payload: ValidateOtpVerificationPayload,
	): Promise<{ valid: boolean }> {
		return this.deps.validateOtp.execute({
			recipientid: payload.recipientId,
			code: payload.code,
			purpose: payload.purpose,
		});
	}
}
