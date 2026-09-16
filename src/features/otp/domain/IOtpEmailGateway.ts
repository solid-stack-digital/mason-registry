export interface SendOtpEmailPayload {
  to: string;
  subject: string;
  body: string;
}

/**
 * Domain port for sending OTP-related emails.
 * Following Clean Architecture microservice boundaries, OTP defines its own
 * local contract of what it requires from the mailing feature.
 */
export abstract class IOtpEmailGateway {
  abstract sendEmail(payload: SendOtpEmailPayload): Promise<void>;
}
