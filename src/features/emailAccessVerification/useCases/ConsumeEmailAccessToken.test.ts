import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { Time } from "@/shared/time/domain/Time.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import type {
	DecodedEmailAccessPayload,
	EmailAccess,
} from "../domain/EmailAccess.js";
import {
	EmailAccessEmailMismatchError,
	EmailAccessTokenAlreadyUsedError,
	EmailAccessTokenExpiredError,
} from "../domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "../infrastructure/StubEmailAccessRepository.js";
import { DecodeAndValidateToken } from "../services/DecodeAndValidateToken.js";
import { ConsumeEmailAccessToken } from "./ConsumeEmailAccessToken.js";

describe("ConsumeEmailAccessToken Use Case", () => {
	let container: Container;
	let useCase: ConsumeEmailAccessToken;
	let stubRepo: StubEmailAccessRepository;
	let service: DecodeAndValidateToken;
	let stubTime: StubTimeEngine;

	const BASE_TIME = 1_700_000_000_000;

	beforeEach(() => {
		container = new Container();

		// Configure Time
		container.provide(ITimeEngine, StubTimeEngine);
		stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);

		// Configure JWT
		container.provide(IJwtEngine, HmacJwtEngine);

		// Configure Repo stub
		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
		container.provideValue(InitialEmailAccesses, []);

		service = container.resolve(DecodeAndValidateToken);
		useCase = container.resolve(ConsumeEmailAccessToken);
		stubRepo = container.resolve(
			IEmailAccessRepository,
		) as StubEmailAccessRepository;
	});

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
		it("should validate via service, verify email match, invalidate/consume token in repo, and return true", async () => {
			const record = makeRecord();
			await stubRepo.save(record);

			const decoded: DecodedEmailAccessPayload = {
				jti: "jti-1",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
			};
			const spy = vi.spyOn(service, "execute").mockResolvedValueOnce(decoded);

			const updateSpy = vi.spyOn(stubRepo, "update");

			const result = await useCase.execute({
				token: "sample.jwt.token",
				purpose: "RESET_PASSWORD",
				email: "user@example.com",
			});

			expect(result).toBe(true);
			expect(spy).toHaveBeenCalledWith({
				token: "sample.jwt.token",
				purpose: "RESET_PASSWORD",
			});

			expect(updateSpy).toHaveBeenCalledTimes(1);
			const updated = await stubRepo.findByJti("jti-1");
			expect(updated?.isUsed).toBe(true);
			expect(updated?.isInvalidated).toBe(true);
		});

		it("should handle case-insensitive email comparison", async () => {
			const record = makeRecord({ email: "user@example.com" });
			await stubRepo.save(record);

			vi.spyOn(service, "execute").mockResolvedValueOnce({
				jti: "jti-1",
				email: "USER@EXAMPLE.COM",
				purpose: "RESET_PASSWORD",
			});

			const result = await useCase.execute({
				token: "sample.jwt.token",
				purpose: "RESET_PASSWORD",
				email: "user@example.com",
			});

			expect(result).toBe(true);
		});
	});

	describe("Validation & Email Mismatch", () => {
		it("should throw EmailAccessEmailMismatchError if email differs from email in decoded", async () => {
			vi.spyOn(service, "execute").mockResolvedValueOnce({
				jti: "jti-1",
				email: "actual-user@example.com",
				purpose: "RESET_PASSWORD",
			});

			await expect(
				useCase.execute({
					token: "sample.jwt.token",
					purpose: "RESET_PASSWORD",
					email: "attacker@example.com",
				}),
			).rejects.toThrow(EmailAccessEmailMismatchError);
		});

		it("should throw EmailAccessEmailMismatchError if email parameter is missing", async () => {
			await expect(
				useCase.execute({
					token: "sample.jwt.token",
					purpose: "RESET_PASSWORD",
					email: "",
				}),
			).rejects.toThrow(EmailAccessEmailMismatchError);
		});
	});

	describe("Error Bubbling & Service Failures", () => {
		it("should bubble up service errors such as expired token", async () => {
			vi.spyOn(service, "execute").mockRejectedValueOnce(
				new EmailAccessTokenExpiredError("Token expired"),
			);

			await expect(
				useCase.execute({
					token: "expired.token",
					purpose: "RESET_PASSWORD",
					email: "user@example.com",
				}),
			).rejects.toThrow(EmailAccessTokenExpiredError);
		});

		it("should bubble up service errors such as already used token", async () => {
			vi.spyOn(service, "execute").mockRejectedValueOnce(
				new EmailAccessTokenAlreadyUsedError("Token already used"),
			);

			await expect(
				useCase.execute({
					token: "used.token",
					purpose: "RESET_PASSWORD",
					email: "user@example.com",
				}),
			).rejects.toThrow(EmailAccessTokenAlreadyUsedError);
		});
	});
});
