import { type DepsType, MakeInjectable, ValueToken } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import type { IMailer, SentMail } from "../domain/IMailer.js";

export class InitialSendStatus extends ValueToken<boolean> {}

@MakeInjectable
export class StubMailer implements IMailer {
	private sendStatus: boolean;
	private sentMails: SentMail[] = [];
	private errorToThrow: Error | null = null;
	private simulateFailure = false;

	public static deps = {
		initialStatus: InitialSendStatus,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof StubMailer.deps>) {
		this.sendStatus = this.deps.initialStatus;
	}

	public setSendStatus(status: boolean): void {
		this.sendStatus = status;
	}

	public setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	async send(mail: {
		to: string;
		subject: string;
		body: string;
		isHtml?: boolean | undefined;
	}): Promise<{ ok: boolean }> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (this.simulateFailure) {
			throw new Error("External mailing service unavailable (500)");
		}
		const now = this.deps.clock.now();
		this.sentMails.push({
			to: mail.to,
			subject: mail.subject,
			body: mail.body,
			isHtml: mail.isHtml,
			sentAt: now,
		});
		return { ok: this.sendStatus };
	}

	getSentMails(): SentMail[] {
		return [...this.sentMails];
	}

	clear(): void {
		this.sentMails = [];
	}

	setSimulateFailure(fail: boolean): void {
		this.simulateFailure = fail;
	}
}
