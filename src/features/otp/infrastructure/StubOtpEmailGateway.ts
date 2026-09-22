import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	IOtpEmailGateway,
	SendOtpEmailPayload,
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
