import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMailingTestContainer } from "../__tests__/utils/getMailingTestContainer.js";
import { StubMailer } from "../infrastructure/StubMailer.js";
import { SendEmail } from "./SendEmail.js";

describe("SendEmail UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getMailingTestContainer();

		mailer = container.resolve(StubMailer);
		sendEmail = container.resolve(SendEmail);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let mailer: StubMailer;
	let sendEmail: SendEmail;

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
			}),
		).rejects.toThrow("Invalid email address format");
	});
});
