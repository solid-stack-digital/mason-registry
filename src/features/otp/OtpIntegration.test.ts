import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { IMailer } from "@/features/mailing/domain/IMailer.js";
import { MemoryMailer } from "@/features/mailing/infrastructure/MemoryMailer.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { CryptoIdGenerator } from "@/shared/uuid/infrastructure/CryptoIdGenerator.js";
import { IIdGenerator } from "@/shared/uuid/ports/IIdGenerator.js";
import { OtpProvider } from "./diProvider.js";
import {
	OtpExpiredError,
	OtpInvalidCodeError,
	OtpMaxAttemptsExceededError,
} from "./domain/errors/OtpErrors.js";
import { IOtpEmailGateway } from "./domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { OtpEmailGateway } from "./infrastructure/OtpEmailGateway.js";
import { OtpConfigToken } from "./tokens.js";
import { SendOtp } from "./useCases/SendOtp.js";
import { ValidateOtp } from "./useCases/ValidateOtp.js";

describe("OTP Feature End-to-End Integration", () => {
	let container: Container;
	let stubTime: StubTimeEngine;
	let memoryMailer: MemoryMailer;
	let sendOtp: SendOtp;
	let validateOtp: ValidateOtp;

	const BASE_TIME = 1_700_000_000_000;

	const createTestContainer = (): Container => {
		const c = new Container();

		// Configure time engine (controllable clock for deterministic TTL/cooldown testing)
		c.provide(ITimeEngine, StubTimeEngine);
		stubTime = c.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);

		// Configure UUID generator
		c.provide(IIdGenerator, CryptoIdGenerator);

		// Configure Mailing (real MemoryMailer adapter)
		c.provide(IMailer, MemoryMailer);

		// Wire the target OTP feature with its REAL default provider (NO STUBS for target feature)
		OtpProvider(c);

		// Provide explicit config for predictable test thresholds
		c.provideValue(OtpConfigToken, {
			retryInterval: Duration.fromSeconds(30),
			otpTtl: Duration.fromMinutes(5),
			maxAttempts: 3,
		});

		return c;
	};

	beforeEach(() => {
		container = createTestContainer();

		sendOtp = container.resolve(SendOtp);
		validateOtp = container.resolve(ValidateOtp);
		memoryMailer = container.resolve(IMailer) as MemoryMailer;
	});

	describe("1. DI Container Wiring Verification", () => {
		it("should naturally wire IOtpRepo to MemoryOtpRepo by default", () => {
			const repo = container.resolve(IOtpRepo);
			expect(repo).toBeInstanceOf(MemoryOtpRepo);
		});

		it("should naturally wire IOtpGenerator to CryptoOtpGenerator by default", () => {
			const generator = container.resolve(IOtpGenerator);
			expect(generator).toBeInstanceOf(CryptoOtpGenerator);
		});

		it("should naturally wire IOtpEmailGateway to OtpEmailGateway by default", () => {
			const gateway = container.resolve(IOtpEmailGateway);
			expect(gateway).toBeInstanceOf(OtpEmailGateway);
		});
	});

	describe("2. End-to-End Expected Behaviors", () => {
		it("Behavior 1: Request OTP -> receive OTP via email -> be able to validate it", async () => {
			// Arrange & Act: 1. Request OTP
			const sendResult = await sendOtp.execute({
				recipientId: "user-42",
				recipientEmail: "user42@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Assert: OTP email was dispatched by the real mailer
			const sentMails = memoryMailer.getSentMails();
			expect(sentMails).toHaveLength(1);
			expect(sentMails[0]?.to).toBe("user42@example.com");

			// Extract the 6-digit OTP from the email body
			const match = sentMails[0]?.body.match(/\b\d{6}\b/);
			expect(match).not.toBeNull();
			const receivedCode = match ? match[0] : "";
			expect(receivedCode).toBe(sendResult.otpCode);

			// Act: 2. Validate the received OTP
			const isValid = await validateOtp.execute({
				recipientId: "user-42",
				purpose: "LOGIN",
				otp: receivedCode,
			});

			// Assert: Validation succeeded
			expect(isValid).toBe(true);
		});

		it("Behavior 2: Request OTP -> wait past retryInterval -> request resend -> receive new code -> validate successfully", async () => {
			// Arrange: 1. Initial request
			await sendOtp.execute({
				recipientId: "user-42",
				recipientEmail: "user42@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			// Wait past retryInterval (30s)
			stubTime.advance(35_000);

			// Act: 2. Request resend (calling sendOtp again)
			const resendResult = await sendOtp.execute({
				recipientId: "user-42",
				recipientEmail: "user42@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			const sentMails = memoryMailer.getSentMails();
			expect(sentMails).toHaveLength(2);

			const newCode = resendResult.otpCode;
			expect(newCode).toBeDefined();

			// Act: 3. Validate new code
			const isValid = await validateOtp.execute({
				recipientId: "user-42",
				purpose: "LOGIN",
				otp: newCode ?? "",
			});

			expect(isValid).toBe(true);
		});

		it("Behavior 3: Request OTP -> user waits past otpTtl -> types correct code -> receives explicit 'Code expired, please request a new one'", async () => {
			// Arrange: 1. Request OTP
			const sendResult = await sendOtp.execute({
				recipientId: "user-distracted",
				recipientEmail: "distracted@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			const correctCode = sendResult.otpCode ?? "";

			// Act: 2. User gets distracted and waits past configs.otpTtl (5 minutes + 1 second)
			stubTime.advance(301_000);

			// Assert: User types the correct code, receives explicit expiration error
			await expect(
				validateOtp.execute({
					recipientId: "user-distracted",
					purpose: "LOGIN",
					otp: correctCode,
				}),
			).rejects.toThrow(OtpExpiredError);

			await expect(
				validateOtp.execute({
					recipientId: "user-distracted",
					purpose: "LOGIN",
					otp: correctCode,
				}),
			).rejects.toThrow("Code expired, please request a new one");
		});

		it("Behavior 4: Request OTP -> enter wrong code multiple times -> hit maxAttempts -> receives 'Too many failed attempts. This code has been invalidated.'", async () => {
			// Arrange: 1. Request OTP (maxAttempts = 3)
			const sendResult = await sendOtp.execute({
				recipientId: "user-bruteforce",
				recipientEmail: "bruteforce@example.com",
				purpose: "LOGIN",
				mode: "email",
			});

			const correctCode = sendResult.otpCode ?? "";

			// Act & Assert: Enter wrong code 2 times
			await expect(
				validateOtp.execute({
					recipientId: "user-bruteforce",
					purpose: "LOGIN",
					otp: "000000",
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			await expect(
				validateOtp.execute({
					recipientId: "user-bruteforce",
					purpose: "LOGIN",
					otp: "000000",
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			// 3rd attempt: Hit maxAttempts -> code invalidated
			await expect(
				validateOtp.execute({
					recipientId: "user-bruteforce",
					purpose: "LOGIN",
					otp: "000000",
				}),
			).rejects.toThrow(OtpMaxAttemptsExceededError);

			await expect(
				validateOtp.execute({
					recipientId: "user-bruteforce",
					purpose: "LOGIN",
					otp: "000000",
				}),
			).rejects.toThrow(
				"Too many failed attempts. This code has been invalidated.",
			);

			// 4th attempt: Even with the CORRECT code, it is rejected because it was invalidated
			await expect(
				validateOtp.execute({
					recipientId: "user-bruteforce",
					purpose: "LOGIN",
					otp: correctCode,
				}),
			).rejects.toThrow(
				"Too many failed attempts. This code has been invalidated.",
			);
		});

		it("Behavior 5: Request OTP (Code A) -> Request OTP again (Code B) -> attempt to use Code A -> receives 'Invalid code' because Code B burned Code A", async () => {
			// Arrange: 1. Request Code A
			const sendResultA = await sendOtp.execute({
				recipientId: "user-overlap",
				recipientEmail: "overlap@example.com",
				purpose: "LOGIN",
				mode: "email",
			});
			const codeA = sendResultA.otpCode ?? "";

			// Advance past cooldown
			stubTime.advance(35_000);

			// 2. Request Code B (this burns Code A)
			const sendResultB = await sendOtp.execute({
				recipientId: "user-overlap",
				recipientEmail: "overlap@example.com",
				purpose: "LOGIN",
				mode: "email",
			});
			const codeB = sendResultB.otpCode ?? "";
			expect(codeB).not.toBe(codeA);

			// Act & Assert: Attempt to use burned Code A
			await expect(
				validateOtp.execute({
					recipientId: "user-overlap",
					purpose: "LOGIN",
					otp: codeA,
				}),
			).rejects.toThrow(OtpInvalidCodeError);

			await expect(
				validateOtp.execute({
					recipientId: "user-overlap",
					purpose: "LOGIN",
					otp: codeA,
				}),
			).rejects.toThrow("Invalid code");

			// Active Code B can still be validated successfully
			const isCodeBValid = await validateOtp.execute({
				recipientId: "user-overlap",
				purpose: "LOGIN",
				otp: codeB,
			});
			expect(isCodeBValid).toBe(true);
		});
	});
});
