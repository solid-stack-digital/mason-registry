import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IMailer } from "../domain/IMailer.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean | undefined;
};

export type SendEmailOutput = {
  ok: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@MakeInjectable
export class SendEmail {
  public static deps = {
    mailer: IMailer,
  };

  constructor(public deps: DepsType<typeof SendEmail.deps>) {}

  async execute(props: SendEmailInput): Promise<SendEmailOutput> {
    if (!props.to || typeof props.to !== "string" || !EMAIL_REGEX.test(props.to.trim())) {
      throw new Error(`Invalid email address format: ${props.to}`);
    }
    if (typeof props.subject !== "string") {
      throw new Error("Subject must be a string");
    }
    if (typeof props.body !== "string") {
      throw new Error("Body must be a string");
    }

    const result = await this.deps.mailer.send({
      to: props.to.trim(),
      subject: props.subject,
      body: props.body,
      isHtml: props.isHtml,
    });

    return { ok: result.ok };
  }
}
