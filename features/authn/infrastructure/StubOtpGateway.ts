import { MakeInjectable, type DepsType } from "@solid-stack/di";
import {
  IOtpGateway,
  type SendOtpVerificationPayload,
  type ValidateOtpVerificationPayload,
} from "../domain/IOtpGateway.js";

/**
 * In-memory test stub for IOtpGateway.
 */
@MakeInjectable
export class StubOtpGateway implements IOtpGateway {
  public static deps = {};
  public sentOtps: SendOtpVerificationPayload[] = [];
  public nextValidationResult: { valid: boolean } = { valid: true };
  public shouldFailValidation = false;

  constructor(public deps: DepsType<typeof StubOtpGateway.deps>) {}

  async sendVerificationOtp(payload: SendOtpVerificationPayload): Promise<void> {
    this.sentOtps.push({ ...payload });
  }

  async validateOtp(payload: ValidateOtpVerificationPayload): Promise<{ valid: boolean }> {
    if (this.shouldFailValidation) {
      throw new Error("Invalid or expired verification code");
    }
    return this.nextValidationResult;
  }

  clear(): void {
    this.sentOtps = [];
    this.shouldFailValidation = false;
    this.nextValidationResult = { valid: true };
  }
}
