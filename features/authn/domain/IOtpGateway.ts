export interface SendOtpVerificationPayload {
  recipientId: string;
  email: string;
  purpose: string;
}

export interface ValidateOtpVerificationPayload {
  recipientId: string;
  code: string;
  purpose: string;
}

/**
 * Domain port for OTP dispatch and validation.
 * Following Clean Architecture microservice boundaries, authn defines its own
 * local contract of what it requires from the OTP feature.
 */
export abstract class IOtpGateway {
  abstract sendVerificationOtp(payload: SendOtpVerificationPayload): Promise<void>;
  abstract validateOtp(payload: ValidateOtpVerificationPayload): Promise<{ valid: boolean }>;
}
