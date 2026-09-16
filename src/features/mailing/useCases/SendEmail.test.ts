import { describe, it, expect, beforeEach } from "vitest";
import { SendEmail } from "./SendEmail.js";
import { MemoryMailer } from "../infrastructure/MemoryMailer.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";

describe("SendEmail UseCase", () => {
  let mailer: MemoryMailer;
  let sendEmail: SendEmail;

  beforeEach(() => {
    const clock = new Clock({ timeEngine: new StubTimeEngine({}) });
    mailer = new MemoryMailer({ clock });
    sendEmail = new SendEmail({ mailer });
  });

  it("successfully sends valid email", async () => {
    const res = await sendEmail.execute({
      to: "recipient@example.com",
      subject: "Welcome",
      body: "Welcome to our platform!",
      isHtml: false,
    });

    expect(res.ok).toBe(true);
    const sent = mailer.getSentMails();
    expect(sent.length).toBe(1);
    expect(sent[0]?.to).toBe("recipient@example.com");
    expect(sent[0]?.subject).toBe("Welcome");
  });

  it("throws on invalid email format", async () => {
    await expect(
      sendEmail.execute({
        to: "not-an-email",
        subject: "Hi",
        body: "Test",
      })
    ).rejects.toThrow("Invalid email address format");
  });
});
