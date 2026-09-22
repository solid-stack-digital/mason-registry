import { describe, expect, it, vi } from "vitest";
import type { ConsumeEmailAccessToken } from "@/features/emailAccessVerification/useCases/ConsumeEmailAccessToken.js";
import { EAVGateway } from "./EAVGateway.js";
import { StubEAVGateway } from "./StubEAVGateway.js";

describe("EAVGateway", () => {
	it("delegates consumeEmailAccessToken to the usecase", async () => {
		const mockExecute = vi.fn().mockResolvedValue(true);
		const mockUc = {
			execute: mockExecute,
		} as unknown as ConsumeEmailAccessToken;

		const gateway = new EAVGateway({ consumeEmailAccessToken: mockUc });
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
		const stub = new StubEAVGateway({});
		expect(
			await stub.consumeEmailAccessToken({
				token: "t",
				purpose: "p",
				email: "e",
			}),
		).toBe(true);

		stub.setErrorToThrow(new Error("Custom gateway error"));
		await expect(
			stub.consumeEmailAccessToken({ token: "t", purpose: "p", email: "e" }),
		).rejects.toThrow("Custom gateway error");
	});
});
