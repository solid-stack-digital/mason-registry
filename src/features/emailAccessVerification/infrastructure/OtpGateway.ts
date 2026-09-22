import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { SendOtp } from "@/features/otp/useCases/SendOtp.js";
import { ValidateOtp } from "@/features/otp/useCases/ValidateOtp.js";
import type {
	IOtpGateway,
	SendOtpParams,
	ValidateOtpParams,
} from "../domain/IOtpGateway.js";

@MakeInjectable
export class OtpGateway implements IOtpGateway {
	public static deps = {
		sendOtp: SendOtp,
		validateOtp: ValidateOtp,
	};

	constructor(public deps: DepsType<typeof OtpGateway.deps>) {}

	async sendOtp(params: SendOtpParams): Promise<{ otpCode?: string }> {
		const result = await this.deps.sendOtp.execute({
			recipientId: params.recipientId,
			recipientEmail: params.recipientEmail,
			purpose: params.purpose,
			mode: params.mode,
		});
		return { otpCode: result.otpCode };
	}

	async validateOtp(params: ValidateOtpParams): Promise<boolean> {
		return this.deps.validateOtp.execute({
			recipientId: params.recipientId,
			purpose: params.purpose,
			otp: params.otp,
		});
	}
}
