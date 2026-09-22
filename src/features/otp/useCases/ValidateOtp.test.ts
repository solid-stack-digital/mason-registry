import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import {
	OtpExpiredError,
	OtpInvalidCodeError,
	OtpMaxAttemptsExceededError,
	OtpNotFoundError,
} from "../domain/errors/OtpErrors.js";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import type { Otp } from "../domain/Otp.js";
import { InitialOtps, StubOtpRepo } from "../infrastructure/StubOtpRepo.js";
import { OtpConfigToken } from "../tokens.js";
import { ValidateOtp, type ValidateOtpInput } from "./ValidateOtp.js";

describe("ValidateOtp UseCase", () => {
	let container: Container;
	let useCase: ValidateOtp;
	let otpRepo: StubOtpRepo;
	let stubTime: StubTimeEngine;

	const BASE_TIME = 1_700_000_000_000;
	const TTL_MILLIS = 300_000; // 5 minutes

	const createOtp = (overrides: Partial<Otp> = {}): Otp => ({
		id: "otp-test-1",
		recipientId: "user-123",
		recipientEmail: "user@example.com",
		purpose: "LOGIN",
		otpCode: "654321",
		attempts: 0,
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(BASE_TIME + TTL_MILLIS),
		createdAt: new Time(BASE_TIME),
		updatedAt: new Time(BASE_TIME),
		...overrides,
	});

	beforeEach(() => {
		// Arrange: Fresh DI container for total isolation
		container = new Container();

		stubTime = new StubTimeEngine({}, BASE_TIME);
		container.provide(ITimeEngine, StubTimeEngine);

		container.provide(IOtpRepo, StubOtpRepo);
		container.provideValue(InitialOtps, []);
		container.provideValue(OtpConfigToken, {
			retryInterval: Duration.fromSeconds(30),
			otpTtl: Duration.fromMinutes(5),
			maxAttempts: 3,
		});

		useCase = container.resolve(ValidateOtp);
		otpRepo = container.resolve(IOtpRepo) as StubOtpRepo;
		stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);
	});

	describe("Success Paths & Interactions (Contract Enforcement)", () => {
		it("should validate active OTP successfully, mark it as used, and return true", async () => {
			// Arrange
			const otp = createOtp();
			await otpRepo.save(otp);
			const updateSpy = vi.spyOn(otpRepo, "update");

			// Act
			const result = await useCase.execute({
				recipientId: "user-123",
				purpose: "LOGIN",
				otp: "654321",
			});

			// Assert
			expect(result).toBe(true);
			expect(updateSpy).toHaveBeenCalledTimes(1);

			const saved = await otpRepo.findLatestByRecipientAndPurpose(
				"user-123",
				"LOGIN",
			);
			expect(saved).toBeDefined();
			expect(saved?.isUsed).toBe(true);
			expect(saved?.isInvalidated).toBe(false);
		});
	});

	describe("Expected Behavior 3: Distracted user / Expiration Handling", () => {
		it("should throw explicit 'Code expired, please request a new one' when user types correct code past otpTtl", async () => {
			// Arrange: Stored OTP with 5m TTL
			const otp = createOtp();
			await otpRepo.save(otp);

			// Act: User gets distracted and waits past configs.otpTtl (e.g. 5 mins and 1 sec)
			stubTime.advance(TTL_MILLIS + 1000);

			// Assert: User types the CORRECT OTP, receives explicit expiration error
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow(OtpExpiredError);

			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow("Code expired, please request a new one");
		});
	});

	describe("Expected Behavior 4: Multiple Failed Attempts / Max Attempts Limit", () => {
		it("should increment attempts on wrong code and invalidate code when maxAttempts is hit", async () => {
			// Arrange: maxAttempts = 3
			const otp = createOtp();
			await otpRepo.save(otp);

			// Attempt 1: wrong code -> throws 'Invalid code', attempts = 1
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "000000",
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			let current = await otpRepo.findLatestByRecipientAndPurpose(
				"user-123",
				"LOGIN",
			);
			expect(current?.attempts).toBe(1);
			expect(current?.isInvalidated).toBe(false);

			// Attempt 2: wrong code -> throws 'Invalid code', attempts = 2
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "111111",
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			current = await otpRepo.findLatestByRecipientAndPurpose(
				"user-123",
				"LOGIN",
			);
			expect(current?.attempts).toBe(2);
			expect(current?.isInvalidated).toBe(false);

			// Attempt 3: hit maxAttempts (3) -> invalidates code, throws explicit max attempts error
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "222222",
				}),
			).rejects.toThrow(OtpMaxAttemptsExceededError);

			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "222222",
				}),
			).rejects.toThrow(
				"Too many failed attempts. This code has been invalidated.",
			);

			current = await otpRepo.findLatestByRecipientAndPurpose(
				"user-123",
				"LOGIN",
			);
			expect(current?.attempts).toBe(3);
			expect(current?.isInvalidated).toBe(true);

			// Attempt 4: Even with the CORRECT code, it must reject because it was invalidated
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow(
				"Too many failed attempts. This code has been invalidated.",
			);
		});
	});

	describe("Expected Behavior 5: Invalidation of Previous Code (Code A burned by Code B)", () => {
		it("should reject Code A with 'Invalid code' when it was burned / invalidated", async () => {
			// Arrange: Code A is marked invalidated because Code B was generated
			const codeA = createOtp({
				id: "otp-code-a",
				otpCode: "111111",
				isInvalidated: true,
			});
			await otpRepo.save(codeA);

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "111111",
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "111111",
				}),
			).rejects.toThrow("Invalid code");
		});
	});

	describe("Edge Cases & Validation", () => {
		it("should reject already used code with 'Invalid code'", async () => {
			// Arrange
			const usedOtp = createOtp({ isUsed: true });
			await otpRepo.save(usedOtp);

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow("Invalid code");
		});

		it("should reject when no OTP record exists", async () => {
			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "unknown-user",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow(OtpNotFoundError);
		});

		it("should throw when required inputs are missing", async () => {
			// Act & Assert (bypass TS using as any)
			await expect(
				useCase.execute({
					purpose: "LOGIN",
					otp: "654321",
				} as unknown as ValidateOtpInput),
			).rejects.toThrow("recipientId and otp code are required");

			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
				} as unknown as ValidateOtpInput),
			).rejects.toThrow("recipientId and otp code are required");
		});

		it("should accept alternative prop names (recipientid, code, otpCode)", async () => {
			// Arrange
			await otpRepo.save(
				createOtp({ otpCode: "998877", purpose: "EMAIL_VERIFICATION" }),
			);

			// Act & Assert
			const valid = await useCase.execute({
				recipientid: "user-123",
				code: "998877",
			});
			expect(valid).toBe(true);
		});
	});

	describe("Error Bubbling & Infrastructure Failures", () => {
		it("should bubble up repository update failures", async () => {
			// Arrange
			await otpRepo.save(createOtp());
			vi.spyOn(otpRepo, "update").mockRejectedValueOnce(new Error("Disk full"));

			// Act & Assert
			await expect(
				useCase.execute({
					recipientId: "user-123",
					purpose: "LOGIN",
					otp: "654321",
				}),
			).rejects.toThrow("Disk full");
		});
	});
});
