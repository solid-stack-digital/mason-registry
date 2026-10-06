import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IOtpGateway } from "@/features/emailAccessVerification/domain/IOtpGateway.js";
import { getEmailAccessVerificationTestContainer } from "../__tests__/utils/getEmailAccessVerificationTestContainer.js";
import { StubOtpGateway } from "./StubOtpGateway.js";

describe("StubOtpGateway", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getEmailAccessVerificationTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provide(IOtpGateway, StubOtpGateway);
		stub = container.resolve(StubOtpGateway);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	let stub: StubOtpGateway;

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
