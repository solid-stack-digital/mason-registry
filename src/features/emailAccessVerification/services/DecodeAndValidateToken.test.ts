import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import type { EmailAccess } from "../domain/EmailAccess.js";
import {
	EmailAccessPurposeMismatchError,
	EmailAccessTokenAlreadyUsedError,
	EmailAccessTokenExpiredError,
	EmailAccessTokenInvalidatedError,
	EmailAccessTokenInvalidError,
	EmailAccessTokenNotFoundError,
} from "../domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "../infrastructure/StubEmailAccessRepository.js";
import { DecodeAndValidateToken } from "./DecodeAndValidateToken.js";

describe("DecodeAndValidateToken Service", () => {
	let container: Container;
	let service: DecodeAndValidateToken;
	let stubTime: StubTimeEngine;
	let stubRepo: StubEmailAccessRepository;
	let jwt: Jwt;

	const BASE_TIME = 1_700_000_000_000;

	beforeEach(() => {
		container = new Container();

		// Configure time
		container.provide(ITimeEngine, StubTimeEngine);
		stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);

		// Configure JWT
		container.provide(IJwtEngine, HmacJwtEngine);
		jwt = container.resolve(Jwt);

		// Configure Repository stub
		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
		container.provideValue(InitialEmailAccesses, []);
		stubRepo = container.resolve(
			IEmailAccessRepository,
		) as StubEmailAccessRepository;

		// Service
		service = container.resolve(DecodeAndValidateToken);
	});

	const createToken = async (
		payload: { jti: string; email: string; purpose: string },
		ttl = Duration.fromMinutes(15),
	) => {
		return jwt.sign(payload, { ttl });
	};

	const makeRecord = (overrides: Partial<EmailAccess> = {}): EmailAccess => ({
		id: "id-1",
		jti: "jti-1",
		email: "user@example.com",
		purpose: "RESET_PASSWORD",
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(BASE_TIME + 900_000),
		createdAt: new Time(BASE_TIME),
		updatedAt: new Time(BASE_TIME),
		...overrides,
	});

	describe("Success Paths & Interactions", () => {
		it("should successfully decode and validate a valid token", async () => {
			// Arrange
			const record = makeRecord();
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			const findSpy = vi.spyOn(stubRepo, "findByJti");

			// Act
			const decoded = await service.execute({
				token,
				purpose: "RESET_PASSWORD",
			});

			// Assert
			expect(decoded).toBeDefined();
			expect(decoded.email).toBe("user@example.com");
			expect(decoded.purpose).toBe("RESET_PASSWORD");
			expect(decoded.jti).toBe("jti-1");
			expect(findSpy).toHaveBeenCalledWith("jti-1");
			expect(findSpy).toHaveBeenCalledTimes(1);
		});

		it("should support calling execute with positional arguments (token, purpose)", async () => {
			// Arrange
			const record = makeRecord();
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			// Act
			const decoded = await service.execute(token, "RESET_PASSWORD");

			// Assert
			expect(decoded.email).toBe("user@example.com");
		});
	});

	describe("Validation & Runtime Type Safety", () => {
		it("should throw EmailAccessTokenInvalidError if token is empty or missing", async () => {
			await expect(
				service.execute({ token: "", purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenInvalidError);

			await expect(
				service.execute({
					token: null as unknown as string,
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow(EmailAccessTokenInvalidError);
		});

		it("should throw EmailAccessPurposeMismatchError if purpose is empty or missing", async () => {
			await expect(
				service.execute({ token: "some.token.value", purpose: "" }),
			).rejects.toThrow(EmailAccessPurposeMismatchError);

			await expect(
				service.execute({
					token: "some.token.value",
					purpose: null as unknown as string,
				}),
			).rejects.toThrow(EmailAccessPurposeMismatchError);
		});

		it("should throw EmailAccessTokenInvalidError if token signature is invalid", async () => {
			const validToken = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});
			const tampered = `${validToken}tampered`;

			await expect(
				service.execute({ token: tampered, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenInvalidError);
		});
	});

	describe("Expiration Checks", () => {
		it("should throw EmailAccessTokenExpiredError if token expired via JWT exp", async () => {
			const token = await createToken(
				{
					jti: "jti-1",
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
				},
				Duration.fromSeconds(5),
			);

			// Advance time past expiration
			stubTime.advance(10_000);

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenExpiredError);
		});

		it("should throw EmailAccessTokenExpiredError if repository record is expired", async () => {
			const record = makeRecord({
				expiresAt: new Time(BASE_TIME + 2_000), // 2 seconds
			});
			await stubRepo.save(record);

			const token = await createToken(
				{
					jti: "jti-1",
					email: "user@example.com",
					purpose: "RESET_PASSWORD",
				},
				Duration.fromMinutes(15),
			);

			// Advance clock past record expiration but within JWT exp
			stubTime.advance(5_000);

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenExpiredError);
		});
	});

	describe("Purpose Matching", () => {
		it("should throw EmailAccessPurposeMismatchError if purpose does not match", async () => {
			const record = makeRecord({ purpose: "LOGIN" });
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "LOGIN",
			});

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessPurposeMismatchError);
		});
	});

	describe("Repository State Checks (not found, invalidated, already used)", () => {
		it("should throw EmailAccessTokenNotFoundError if token JTI is not in repository", async () => {
			const token = await createToken({
				jti: "non-existent-jti",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenNotFoundError);
		});

		it("should throw EmailAccessTokenInvalidError if record email does not match token payload", async () => {
			const record = makeRecord({ email: "other@example.com" });
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenInvalidError);
		});

		it("should throw EmailAccessTokenInvalidatedError if record is invalidated", async () => {
			const record = makeRecord({ isInvalidated: true });
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenInvalidatedError);
		});

		it("should throw EmailAccessTokenAlreadyUsedError if record is already used", async () => {
			const record = makeRecord({ isUsed: true });
			await stubRepo.save(record);

			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow(EmailAccessTokenAlreadyUsedError);
		});
	});

	describe("Error Bubbling & Infrastructure Failures", () => {
		it("should bubble up catastrophic repository errors", async () => {
			const token = await createToken({
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			});

			vi.spyOn(stubRepo, "findByJti").mockRejectedValueOnce(
				new Error("DB connection lost"),
			);

			await expect(
				service.execute({ token, purpose: "RESET_PASSWORD" }),
			).rejects.toThrow("DB connection lost");
		});
	});
});
