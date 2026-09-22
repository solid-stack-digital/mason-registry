import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { CryptoIdGenerator } from "@/shared/uuid/infrastructure/CryptoIdGenerator.js";
import { IIdGenerator } from "@/shared/uuid/ports/IIdGenerator.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "../infrastructure/StubEmailAccessRepository.js";
import { StubOtpGateway } from "../infrastructure/StubOtpGateway.js";
import { EmailAccessConfigToken } from "../tokens.js";
import { ValidateEmailAccess } from "./ValidateEmailAccess.js";

describe("ValidateEmailAccess Use Case", () => {
	let container: Container;
	let useCase: ValidateEmailAccess;
	let stubRepo: StubEmailAccessRepository;
	let stubOtpGateway: StubOtpGateway;
	let jwt: Jwt;
	let stubTime: StubTimeEngine;

	const BASE_TIME = 1_700_000_000_000;

	beforeEach(() => {
		container = new Container();

		// Configure Time
		container.provide(ITimeEngine, StubTimeEngine);
		stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);

		// Configure UUID
		container.provide(IIdGenerator, CryptoIdGenerator);

		// Configure JWT
		container.provide(IJwtEngine, HmacJwtEngine);
		jwt = container.resolve(Jwt);

		// Configure Repo & Gateway stubs
		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
		container.provideValue(InitialEmailAccesses, []);
		container.provide(IOtpGateway, StubOtpGateway);

		// Configure Config
		container.provideValue(EmailAccessConfigToken, {
			jwtTtl: Duration.fromMinutes(30),
		});

		stubRepo = container.resolve(
			IEmailAccessRepository,
		) as StubEmailAccessRepository;
		stubOtpGateway = container.resolve(IOtpGateway) as StubOtpGateway;
		useCase = container.resolve(ValidateEmailAccess);
	});

	describe("Success Paths & Interactions", () => {
		it("should validate OTP, generate JWT with configured TTL, save record in repo, and return JWT", async () => {
			const validateSpy = vi.spyOn(stubOtpGateway, "validateOtp");
			const saveSpy = vi.spyOn(stubRepo, "save");

			const result = await useCase.execute({
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
				code: "123456",
			});

			expect(result.emailAccessJwt).toBeDefined();
			expect(typeof result.emailAccessJwt).toBe("string");

			// 1. Assert validateOtp was called with expected arguments
			expect(validateSpy).toHaveBeenCalledWith({
				recipientId: "user@example.com",
				purpose: "RESET_PASSWORD",
				otp: "123456",
			});

			// 2. Decode the JWT to verify claims
			const payload = await jwt.verify<{
				jti: string;
				email: string;
				purpose: string;
				exp: number;
			}>(result.emailAccessJwt);
			expect(payload.email).toBe("user@example.com");
			expect(payload.purpose).toBe("RESET_PASSWORD");
			expect(payload.jti).toBeDefined();

			// 3. Assert repo saved record with jti, isUsed = false, correct expiration
			expect(saveSpy).toHaveBeenCalledTimes(1);
			const saved = await stubRepo.findByJti(payload.jti);
			expect(saved).not.toBeNull();
			expect(saved?.email).toBe("user@example.com");
			expect(saved?.purpose).toBe("RESET_PASSWORD");
			expect(saved?.isUsed).toBe(false);
			expect(saved?.isInvalidated).toBe(false);
			expect(saved?.expiresAt.millis).toBe(BASE_TIME + 30 * 60 * 1000);
		});
	});

	describe("Validation & Runtime Type Safety", () => {
		it("should throw error if email is missing or empty", async () => {
			await expect(
				useCase.execute({
					email: "",
					purpose: "RESET_PASSWORD",
					code: "123456",
				}),
			).rejects.toThrow("Email is required");

			await expect(
				useCase.execute({
					email: null as unknown as string,
					purpose: "RESET_PASSWORD",
					code: "123456",
				}),
			).rejects.toThrow("Email is required");
		});

		it("should throw error if purpose is missing or empty", async () => {
			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "",
					code: "123456",
				}),
			).rejects.toThrow("Purpose is required");
		});

		it("should throw error if code is missing or empty", async () => {
			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
					code: "",
				}),
			).rejects.toThrow("Code is required");
		});
	});

	describe("Error Handling & OTP Validation Failures", () => {
		it("should throw error if validateOtp returns false", async () => {
			stubOtpGateway.validateResult = false;

			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
					code: "wrong-code",
				}),
			).rejects.toThrow("Invalid OTP code");
		});

		it("should determine reason and throw if validateOtp throws", async () => {
			stubOtpGateway.shouldFailValidate = true;
			stubOtpGateway.validateError = new Error(
				"Too many failed attempts. Code invalidated.",
			);

			await expect(
				useCase.execute({
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
					code: "000000",
				}),
			).rejects.toThrow("Too many failed attempts. Code invalidated.");
		});
	});
});
