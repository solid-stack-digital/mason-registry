import { MakeInjectable, type DepsType } from "@solid-stack/di";
import {
  IOtpEmailGateway,
  type SendOtpEmailPayload,
} from "../domain/IOtpEmailGateway.js";

/**
 * In-memory test double for IOtpEmailGateway.
 */
@MakeInjectable
export class StubOtpEmailGateway implements IOtpEmailGateway {
  public static deps = {};
  public sentEmails: SendOtpEmailPayload[] = [];

  constructor(public deps: DepsType<typeof StubOtpEmailGateway.deps>) {}

  async sendEmail(payload: SendOtpEmailPayload): Promise<void> {
    this.sentEmails.push({ ...payload });
  }

  clear(): void {
    this.sentEmails = [];
  }
}
