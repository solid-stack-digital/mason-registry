import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import type { IMailer, SentMail } from "../domain/IMailer.js";

@MakeInjectable
export class MemoryMailer implements IMailer {
	public static deps = {
		clock: Clock,
	};
	private sentMails: SentMail[] = [];

	constructor(public deps: DepsType<typeof MemoryMailer.deps>) {}

	async send(mail: {
		to: string;
		subject: string;
		body: string;
		isHtml?: boolean | undefined;
	}): Promise<{ ok: boolean }> {
		const now = this.deps.clock.now();
		this.sentMails.push({
			to: mail.to,
			subject: mail.subject,
			body: mail.body,
			isHtml: mail.isHtml ?? false,
			sentAt: now,
		});
		return { ok: true };
	}

	getSentMails(): SentMail[] {
		return [...this.sentMails];
	}

	clear(): void {
		this.sentMails = [];
	}
}
