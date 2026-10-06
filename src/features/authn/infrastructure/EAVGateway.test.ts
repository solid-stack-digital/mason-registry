import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsumeEmailAccessToken } from "@/features/emailAccessVerification/useCases/ConsumeEmailAccessToken.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { AuthnError } from "../errors/AuthnError.js";
import { EAVGateway } from "./EAVGateway.js";
import { StubEAVGateway } from "./StubEAVGateway.js";

describe("EAVGateway", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	it("delegates consumeEmailAccessToken to the usecase", async () => {
		const mockUc = container.resolve(ConsumeEmailAccessToken);
		const mockExecute = vi.spyOn(mockUc, "execute").mockResolvedValue(true);
		const gateway = container.resolve(EAVGateway);
		const result = await gateway.consumeEmailAccessToken({
			token: "test-token",
			purpose: "email_verification",
			email: "user@example.com",
		});

		expect(result).toBe(true);
		expect(mockExecute).toHaveBeenCalledWith({
			token: "test-token",
			purpose: "email_verification",
			email: "user@example.com",
		});
	});

	it("StubEAVGateway works and throws error when configured", async () => {
		const stub = container.resolve(StubEAVGateway);
		expect(
			await stub.consumeEmailAccessToken({
				token: "t",
				purpose: "p",
				email: "e",
			}),
		).toBe(true);

		stub.setErrorToThrow(new AuthnError("Custom gateway error"));
		await expect(
			stub.consumeEmailAccessToken({ token: "t", purpose: "p", email: "e" }),
		).rejects.toThrow("Custom gateway error");
	});
});
