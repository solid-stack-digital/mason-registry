import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import type { DecodedEmailAccessPayload } from "../domain/EmailAccess.js";
import {
	EmailAccessPurposeMismatchError,
	EmailAccessTokenExpiredError,
	EmailAccessTokenNotFoundError,
} from "../domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "../infrastructure/StubEmailAccessRepository.js";
import { DecodeAndValidateToken } from "../services/DecodeAndValidateToken.js";
import { DecodeEmailAccessToken } from "./DecodeEmailAccessToken.js";

describe("DecodeEmailAccessToken Use Case", () => {
	let container: Container;
	let useCase: DecodeEmailAccessToken;
	let service: DecodeAndValidateToken;

	beforeEach(() => {
		container = new Container();

		container.provide(ITimeEngine, StubTimeEngine);
		container.provide(IJwtEngine, HmacJwtEngine);
		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
		container.provideValue(InitialEmailAccesses, []);

		service = container.resolve(DecodeAndValidateToken);
		useCase = container.resolve(DecodeEmailAccessToken);
	});

	describe("Success Paths & Interactions", () => {
		it("should delegate to services.decodeAndValidateToken and return decoded payload", async () => {
			const expectedPayload: DecodedEmailAccessPayload = {
				jti: "jti-123",
				email: "user@example.com",
				purpose: "RESET_PASSWORD",
				exp: 1700001000,
			};

			const spy = vi
				.spyOn(service, "execute")
				.mockResolvedValueOnce(expectedPayload);

			const result = await useCase.execute({
				token: "sample.jwt.token",
				purpose: "RESET_PASSWORD",
			});

			expect(result).toEqual(expectedPayload);
			expect(spy).toHaveBeenCalledWith({
				token: "sample.jwt.token",
				purpose: "RESET_PASSWORD",
			});
			expect(spy).toHaveBeenCalledTimes(1);
		});
	});

	describe("Error Bubbling & Edge Cases", () => {
		it("should bubble up EmailAccessTokenExpiredError from service", async () => {
			vi.spyOn(service, "execute").mockRejectedValueOnce(
				new EmailAccessTokenExpiredError("Token expired"),
			);

			await expect(
				useCase.execute({
					token: "expired.jwt.token",
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow(EmailAccessTokenExpiredError);
		});

		it("should bubble up EmailAccessPurposeMismatchError from service", async () => {
			vi.spyOn(service, "execute").mockRejectedValueOnce(
				new EmailAccessPurposeMismatchError("Purpose mismatch"),
			);

			await expect(
				useCase.execute({
					token: "jwt.token",
					purpose: "WRONG_PURPOSE",
				}),
			).rejects.toThrow(EmailAccessPurposeMismatchError);
		});

		it("should bubble up EmailAccessTokenNotFoundError from service", async () => {
			vi.spyOn(service, "execute").mockRejectedValueOnce(
				new EmailAccessTokenNotFoundError("Token not found in repo"),
			);

			await expect(
				useCase.execute({
					token: "jwt.token",
					purpose: "RESET_PASSWORD",
				}),
			).rejects.toThrow(EmailAccessTokenNotFoundError);
		});
	});
});
