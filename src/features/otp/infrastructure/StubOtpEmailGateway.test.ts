import { describe, expect, it } from "vitest";
import { StubOtpEmailGateway } from "./StubOtpEmailGateway.js";

describe("StubOtpEmailGateway", () => {
	it("should record sent emails in memory", async () => {
		const stub = new StubOtpEmailGateway({});
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
		const stub = new StubOtpEmailGateway({});
		await stub.sendEmail({ to: "a@b.com", subject: "s", body: "b" });
		expect(stub.sentEmails).toHaveLength(1);

		stub.clear();
		expect(stub.sentEmails).toHaveLength(0);
	});
});
