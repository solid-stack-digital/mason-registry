export interface SendOtpParams {
	recipientId: string;
	recipientEmail: string;
	purpose: string;
	mode: "email";
}

export interface ValidateOtpParams {
	recipientId: string;
	purpose: string;
	otp: string;
}

export abstract class IOtpGateway {
	abstract sendOtp(params: SendOtpParams): Promise<{ otpCode?: string }>;
	abstract validateOtp(params: ValidateOtpParams): Promise<boolean>;
}
