import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { StubOtpGateway } from "./StubOtpGateway.js";

describe("StubOtpGateway", () => {
	let container: Container;
	let stub: StubOtpGateway;

	beforeEach(() => {
		container = new Container();
		stub = container.resolve(StubOtpGateway);
	});

	it("sends OTP and tracks calls", async () => {
		const res = await stub.sendOtp({
			recipientId: "test@example.com",
			recipientEmail: "test@example.com",
			purpose: "LOGIN",
			mode: "email",
		});
		expect(res.otpCode).toBe("123456");
		expect(stub.sentOtps).toHaveLength(1);
	});

	it("throws error when configured to fail", async () => {
		stub.shouldFailSend = true;
		stub.sendError = new Error("Network error");

		await expect(
			stub.sendOtp({
				recipientId: "test@example.com",
				recipientEmail: "test@example.com",
				purpose: "LOGIN",
				mode: "email",
			}),
		).rejects.toThrow("Network error");
	});
});
