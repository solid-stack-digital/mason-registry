import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Time } from "@/shared/time/domain/Time.js";
import type { EmailAccess } from "../domain/EmailAccess.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "../infrastructure/StubEmailAccessRepository.js";
import { StubOtpGateway } from "../infrastructure/StubOtpGateway.js";
import { RequestEmailAccessVerification } from "./RequestEmailAccessVerification.js";

describe("RequestEmailAccessVerification Use Case", () => {
	let container: Container;
	let useCase: RequestEmailAccessVerification;
	let stubRepo: StubEmailAccessRepository;
	let stubOtpGateway: StubOtpGateway;

	beforeEach(() => {
		container = new Container();

		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
		container.provideValue(InitialEmailAccesses, []);
		container.provide(IOtpGateway, StubOtpGateway);

		stubRepo = container.resolve(
			IEmailAccessRepository,
		) as StubEmailAccessRepository;
		stubOtpGateway = container.resolve(IOtpGateway) as StubOtpGateway;
		useCase = container.resolve(RequestEmailAccessVerification);
	});

	const makeRecord = (overrides: Partial<EmailAccess> = {}): EmailAccess => ({
		id: "id-1",
		jti: "jti-1",
		email: "user@example.com",
		purpose: "RESET_PASSWORD",
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(200_000),
		createdAt: new Time(100_000),
		updatedAt: new Time(100_000),
		...overrides,
	});

	describe("Success Paths & Interactions", () => {
		it("should successfully request verification when no prior tokens exist", async () => {
			const sendSpy = vi.spyOn(stubOtpGateway, "sendOtp");
			const invalidateSpy = vi.spyOn(
				stubRepo,
				"invalidateAllForEmailAndPurpose",
			);

			const result = await useCase.execute({
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			expect(result.success).toBe(true);
			expect(result.otpCode).toBe("123456");
			expect(sendSpy).toHaveBeenCalledWith({
				recipientId: "user@example.com",
				recipientEmail: "user@example.com",
				purpose: "RESET_PASSWORD",
				mode: "email",
			});
			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(invalidateSpy).not.toHaveBeenCalled();
		});

		it("should invalidate all existing active tokens for email and purpose before sending OTP", async () => {
			await stubRepo.save(
				makeRecord({ id: "acc-1", jti: "jti-1", isInvalidated: false }),
			);
			await stubRepo.save(
				makeRecord({ id: "acc-2", jti: "jti-2", isInvalidated: false }),
			);

			const invalidateSpy = vi.spyOn(
				stubRepo,
				"invalidateAllForEmailAndPurpose",
			);

			const result = await useCase.execute({
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			expect(result.success).toBe(true);
			expect(invalidateSpy).toHaveBeenCalledWith(
				"user@example.com",
				"RESET_PASSWORD",
			);

			const active = await stubRepo.findActiveByEmailAndPurpose(
				"user@example.com",
				"RESET_PASSWORD",
			);
			expect(active).toHaveLength(0);
		});
	});

	describe("Validation & Runtime Type Safety", () => {
		it("should throw error if email is empty or invalid", async () => {
			await expect(
				useCase.execute({ email: "", purpose: "RESET_PASSWORD" }),
			).rejects.toThrow("Email is required");

			await expect(
				useCase.execute({
					email: null as unknown as string,
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow("Email is required");
		});

		it("should throw error if purpose is empty or invalid", async () => {
			await expect(
				useCase.execute({ email: "user@example.com", purpose: "" }),
			).rejects.toThrow("Purpose is required");

			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: null as unknown as string,
				}),
			).rejects.toThrow("Purpose is required");
		});
	});

	describe("Error Bubbling & Infrastructure Failures", () => {
		it("should determine reason and re-throw error if otpGateway.sendOtp fails", async () => {
			stubOtpGateway.shouldFailSend = true;
			stubOtpGateway.sendError = new Error("Rate limit exceeded for OTP");

			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow("Rate limit exceeded for OTP");
		});

		it("should bubble repository errors during active token check", async () => {
			vi.spyOn(stubRepo, "findActiveByEmailAndPurpose").mockRejectedValueOnce(
				new Error("Database error"),
			);

			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow("Database error");
		});
	});
});
