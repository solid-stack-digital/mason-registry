import type { Time } from "@/shared/time/domain/Time.js";

export interface SentMail {
	to: string;
	subject: string;
	body: string;
	isHtml?: boolean | undefined;
	sentAt: Time;
}

export abstract class IMailer {
	abstract send(mail: {
		to: string;
		subject: string;
		body: string;
		isHtml?: boolean | undefined;
	}): Promise<{ ok: boolean }>;
	abstract getSentMails(): SentMail[];
	abstract clear(): void;
	abstract setSimulateFailure(fail: boolean): void;
}
