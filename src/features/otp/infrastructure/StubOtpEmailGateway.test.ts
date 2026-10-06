import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOtpTestContainer } from "../__tests__/utils/getOtpTestContainer.js";
import { StubOtpEmailGateway } from "./StubOtpEmailGateway.js";

describe("StubOtpEmailGateway", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getOtpTestContainer();
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	it("should record sent emails in memory", async () => {
		const stub = container.resolve(StubOtpEmailGateway);
		expect(stub.sentEmails).toHaveLength(0);

		await stub.sendEmail({
			to: "user@example.com",
			subject: "Code",
			body: "123456",
		});

		expect(stub.sentEmails).toHaveLength(1);
		expect(stub.sentEmails[0]?.to).toBe("user@example.com");
	});

	it("should clear recorded emails when clear() is invoked", async () => {
		const stub = container.resolve(StubOtpEmailGateway);
		await stub.sendEmail({ to: "a@b.com", subject: "s", body: "b" });
		expect(stub.sentEmails).toHaveLength(1);

		stub.clear();
		expect(stub.sentEmails).toHaveLength(0);
	});
});
