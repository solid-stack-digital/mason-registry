import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SendOtp } from "@/features/otp/useCases/SendOtp.js";
import { ValidateOtp } from "@/features/otp/useCases/ValidateOtp.js";
import { getEmailAccessVerificationTestContainer } from "../__tests__/utils/getEmailAccessVerificationTestContainer.js";
import { OtpGateway } from "./OtpGateway.js";

describe("OtpGateway", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getEmailAccessVerificationTestContainer();

		sendOtpMock = container.resolve(SendOtp);
		validateOtpMock = container.resolve(ValidateOtp);
		vi.spyOn(sendOtpMock, "execute").mockResolvedValue({
			expiresAt: "2023-11-14T22:18:20.000Z",
			otpCode: "123456",
			otpId: "otp-1",
		});
		vi.spyOn(validateOtpMock, "execute").mockResolvedValue(true);
		gateway = container.resolve(OtpGateway);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let gateway: OtpGateway;
	let sendOtpMock: SendOtp;
	let validateOtpMock: ValidateOtp;

	it("delegates sendOtp to OTP usecase", async () => {
		const res = await gateway.sendOtp({
			recipientId: "test@example.com",
			recipientEmail: "test@example.com",
			purpose: "RESET_PASSWORD",
			mode: "email",
		});

		expect(res.otpCode).toBe("123456");
		expect(sendOtpMock.execute).toHaveBeenCalledWith({
			recipientId: "test@example.com",
			recipientEmail: "test@example.com",
			purpose: "RESET_PASSWORD",
			mode: "email",
		});
	});

	it("delegates validateOtp to OTP usecase", async () => {
		const valid = await gateway.validateOtp({
			recipientId: "test@example.com",
			purpose: "RESET_PASSWORD",
			otp: "123456",
		});

		expect(valid).toBe(true);
		expect(validateOtpMock.execute).toHaveBeenCalledWith({
			recipientId: "test@example.com",
			purpose: "RESET_PASSWORD",
			otp: "123456",
		});
	});
});
