import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEmailAccessVerificationTestContainer } from "../__tests__/utils/getEmailAccessVerificationTestContainer.js";
import type { DecodedEmailAccessPayload } from "../domain/EmailAccess.js";
import {
	EmailAccessPurposeMismatchError,
	EmailAccessTokenExpiredError,
	EmailAccessTokenNotFoundError,
} from "../errors/EmailAccessErrors.js";
import { DecodeAndValidateToken } from "../services/DecodeAndValidateToken.js";
import { DecodeEmailAccessToken } from "./DecodeEmailAccessToken.js";

describe("DecodeEmailAccessToken Use Case", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getEmailAccessVerificationTestContainer();

		service = container.resolve(DecodeAndValidateToken);
		useCase = container.resolve(DecodeEmailAccessToken);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	let useCase: DecodeEmailAccessToken;
	let service: DecodeAndValidateToken;

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
