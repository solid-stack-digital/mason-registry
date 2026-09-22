import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { StubIdGenerator } from "@/shared/uuid/infrastructure/StubIdGenerator.js";
import { IIdGenerator } from "@/shared/uuid/ports/IIdGenerator.js";
import { OtpCooldownError } from "../domain/errors/OtpErrors.js";
import { IOtpEmailGateway } from "../domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import { StubOtpEmailGateway } from "../infrastructure/StubOtpEmailGateway.js";
import {
	NextOtp,
	StubOtpGenerator,
} from "../infrastructure/StubOtpGenerator.js";
import { InitialOtps, StubOtpRepo } from "../infrastructure/StubOtpRepo.js";
import { OtpConfigToken } from "../tokens.js";
import { SendOtp, type SendOtpInput } from "./SendOtp.js";

describe("SendOtp UseCase", () => {
	let container: Container;
	let useCase: SendOtp;
	let otpRepo: StubOtpRepo;
	let otpGenerator: StubOtpGenerator;
	let emailGateway: StubOtpEmailGateway;
	let stubTime: StubTimeEngine;

	const BASE_TIME = 1_700_000_000_000;

	beforeEach(() => {
		// Arrange: Fresh DI container for total isolation
		container = new Container();

		// Configure time & uuid stubs via DI
		stubTime = new StubTimeEngine({}, BASE_TIME);
		container.provide(ITimeEngine, StubTimeEngine);
		container.provide(IIdGenerator, StubIdGenerator);

		// Provide Stubs for domain ports
		container.provide(IOtpRepo, StubOtpRepo);
		container.provide(IOtpGenerator, StubOtpGenerator);
		container.provide(IOtpEmailGateway, StubOtpEmailGateway);

		container.provideValue(InitialOtps, []);
		container.provideValue(NextOtp, "445566");
		container.provideValue(OtpConfigToken, {
			retryInterval: Duration.fromSeconds(30),
			otpTtl: Duration.fromMinutes(5),
			maxAttempts: 3,
		});

		// Resolve from container
		useCase = container.resolve(SendOtp);
		otpRepo = container.resolve(IOtpRepo) as StubOtpRepo;
		otpGenerator = container.resolve(IOtpGenerator) as StubOtpGenerator;
		emailGateway = container.resolve(IOtpEmailGateway) as StubOtpEmailGateway;
		stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);
	});

	describe("Success Paths & Interactions (Contract Enforcement)", () => {
		it("should generate, persist, and send OTP via email for initial request", async () => {
			// Arrange
			const saveSpy = vi.spyOn(otpRepo, "save");
			const generateSpy = vi.spyOn(otpGenerator, "generate");
			const sendEmailSpy = vi.spyOn(emailGateway, "sendEmail");

			const input: SendOtpInput = {
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "EMAIL_VERIFICATION",
				mode: "email",
			};

			// Act
			const result = await useCase.execute(input);

			// Assert: Contract Enforcement
			expect(generateSpy).toHaveBeenCalledTimes(1);
			expect(saveSpy).toHaveBeenCalledTimes(1);
			expect(sendEmailSpy).toHaveBeenCalledTimes(1);

			expect(sendEmailSpy).toHaveBeenCalledWith({
				to: "user@example.com",
				subject: expect.stringContaining("445566"),
				body: expect.stringContaining("445566"),
			});

			expect(result.otpId).toBeDefined();
			expect(result.otpCode).toBe("445566");

			const savedOtps = otpRepo.getOtps();
			expect(savedOtps).toHaveLength(1);
			expect(savedOtps[0]?.recipientId).toBe("user-123");
			expect(savedOtps[0]?.otpCode).toBe("445566");
			expect(savedOtps[0]?.isUsed).toBe(false);
			expect(savedOtps[0]?.isInvalidated).toBe(false);
		});

		it("should support resending after cooldown by invalidating existing OTP and generating a new one", async () => {
			const updateSpy = vi.spyOn(otpRepo, "update");
			const saveSpy = vi.spyOn(otpRepo, "save");

			// Arrange: First request generates Code A
			otpGenerator.setNextOtp("111111");
			await useCase.execute({
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Advance clock past the 30-second retryInterval
			stubTime.advance(35_000);

			// Act: Second request generates Code B
			otpGenerator.setNextOtp("222222");

			const res = await useCase.execute({
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Assert: Code A was invalidated, Code B was saved
			expect(updateSpy).toHaveBeenCalledTimes(1);
			expect(saveSpy).toHaveBeenCalledTimes(2);
			expect(res.otpCode).toBe("222222");

			const otps = otpRepo.getOtps();
			const codeA = otps.find((o) => o.otpCode === "111111");
			const codeB = otps.find((o) => o.otpCode === "222222");

			expect(codeA?.isInvalidated).toBe(true);
			expect(codeB?.isInvalidated).toBe(false);
		});
	});

	describe("Cooldown & Rate Limiting", () => {
		it("should throw OtpCooldownError if requested within retryInterval", async () => {
			// Arrange: Initial request
			await useCase.execute({
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Advance only 10 seconds (cooldown is 30 seconds)
			stubTime.advance(10_000);

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-123",
					recipientEmail: "user@example.com",
					purpose: "LOGIN",
					mode: "email",
				}),
			).rejects.toThrow(OtpCooldownError);
		});

		it("should allow request if previous OTP was already used or expired even within interval", async () => {
			// Arrange
			await useCase.execute({
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Mark it as used
			const stored = otpRepo.getOtps()[0];
			if (!stored) {
				throw new Error("Expected OTP to exist");
			}
			stored.isUsed = true;
			await otpRepo.update(stored);

			// Advance only 5 seconds
			stubTime.advance(5_000);

			// Act & Assert: Should succeed because previous is not active
			const res = await useCase.execute({
				recipientId: "user-123",
				recipientEmail: "user@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			expect(res.otpId).toBeDefined();
		});
	});

	describe("Edge Cases & Validation", () => {
		it("should throw when recipientId is missing", async () => {
			// Act & Assert
			await expect(
				useCase.execute({
					recipientEmail: "test@example.com",
					mode: "email",
				} as unknown as SendOtpInput),
			).rejects.toThrow("recipientId is required");
		});

		it("should throw when recipientEmail is missing in email mode", async () => {
			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-1",
					mode: "email",
				}),
			).rejects.toThrow("recipientEmail is required for email mode");
		});

		it("should throw for unsupported mode", async () => {
			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-1",
					recipientEmail: "test@example.com",
					mode: "sms" as unknown as "email",
				}),
			).rejects.toThrow("Unsupported OTP mode: sms");
		});

		it("should accept alternative naming props (recipientid, recipientemail, email)", async () => {
			// Act
			const res = await useCase.execute({
				recipientid: "alt-user",
				recipientemail: "alt@example.com",
			});

			// Assert
			expect(res.otpId).toBeDefined();
			expect(otpRepo.getOtps()[0]?.recipientId).toBe("alt-user");
		});
	});

	describe("Error Bubbling & Infrastructure Failures", () => {
		it("should bubble up errors when email gateway fails", async () => {
			// Arrange
			vi.spyOn(emailGateway, "sendEmail").mockRejectedValueOnce(
				new Error("SMTP gateway timeout"),
			);

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-err",
					recipientEmail: "user@example.com",
					mode: "email",
				}),
			).rejects.toThrow("SMTP gateway timeout");
		});

		it("should bubble up errors when repository fails", async () => {
			// Arrange
			vi.spyOn(otpRepo, "save").mockRejectedValueOnce(
				new Error("Database write failure"),
			);

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-err",
					recipientEmail: "user@example.com",
					mode: "email",
				}),
			).rejects.toThrow("Database write failure");
		});
	});
});
