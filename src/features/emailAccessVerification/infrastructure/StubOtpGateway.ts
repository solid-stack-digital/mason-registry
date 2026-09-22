import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	IOtpGateway,
	SendOtpParams,
	ValidateOtpParams,
} from "../domain/IOtpGateway.js";

@MakeInjectable
export class StubOtpGateway implements IOtpGateway {
	public static deps = {};
	public sentOtps: SendOtpParams[] = [];
	public nextOtpCode: string = "123456";
	public shouldFailSend: boolean = false;
	public sendError: Error = new Error("Failed to send OTP");

	public shouldFailValidate: boolean = false;
	public validateError: Error = new Error("Invalid OTP");
	public validateResult: boolean = true;

	constructor(public deps: DepsType<typeof StubOtpGateway.deps>) {}

	async sendOtp(params: SendOtpParams): Promise<{ otpCode?: string }> {
		if (this.shouldFailSend) {
			throw this.sendError;
		}
		this.sentOtps.push(params);
		return { otpCode: this.nextOtpCode };
	}

	async validateOtp(_params: ValidateOtpParams): Promise<boolean> {
		if (this.shouldFailValidate) {
			throw this.validateError;
		}
		return this.validateResult;
	}
}
