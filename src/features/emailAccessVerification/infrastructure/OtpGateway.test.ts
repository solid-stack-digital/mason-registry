import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SendOtp } from "@/features/otp/useCases/SendOtp.js";
import type { ValidateOtp } from "@/features/otp/useCases/ValidateOtp.js";
import { OtpGateway } from "./OtpGateway.js";

describe("OtpGateway", () => {
	let gateway: OtpGateway;
	let sendOtpMock: SendOtp;
	let validateOtpMock: ValidateOtp;

	beforeEach(() => {
		sendOtpMock = {
			execute: vi.fn().mockResolvedValue({ otpCode: "123456" }),
		} as unknown as SendOtp;
		validateOtpMock = {
			execute: vi.fn().mockResolvedValue(true),
		} as unknown as ValidateOtp;

		gateway = new OtpGateway({
			sendOtp: sendOtpMock,
			validateOtp: validateOtpMock,
		});
	});

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
