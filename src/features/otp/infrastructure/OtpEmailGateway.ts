import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { SendEmail } from "@/features/mailing/useCases/SendEmail.js";
import type {
	IOtpEmailGateway,
	SendOtpEmailPayload,
} from "../domain/IOtpEmailGateway.js";

/**
 * Infrastructure adapter implementing IOtpEmailGateway.
 * Bridges OTP to the mailing feature via the SendEmail use case.
 */
@MakeInjectable
export class OtpEmailGateway implements IOtpEmailGateway {
	public static deps = {
		sendEmail: SendEmail,
	};

	constructor(public deps: DepsType<typeof OtpEmailGateway.deps>) {}

	async sendEmail(payload: SendOtpEmailPayload): Promise<void> {
		await this.deps.sendEmail.execute({
			to: payload.to,
			subject: payload.subject,
			body: payload.body,
		});
	}
}
