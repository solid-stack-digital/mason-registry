import type { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHmacTestContainer } from "./__tests__/utils/getHmacTestContainer.js";
import { HmacError } from "./errors/HmacError.js";
import { Hmac } from "./Hmac.js";
import { StubHmacEngine } from "./infrastructure/StubHmacEngine.js";
import { IHmacEngine } from "./ports/IHmacEngine.js";

describe("Hmac", () => {
	let container: Container;
	let hmacEngine: StubHmacEngine;
	let hmac: Hmac;
	const options = {
		secret: "secret-key",
		algorithm: "sha256",
		encoding: "hex",
	} as const;
	beforeEach(async () => {
		container = await getHmacTestContainer();
		container.provide(IHmacEngine, StubHmacEngine);
		hmacEngine = container.resolve(StubHmacEngine);
		hmac = container.resolve(Hmac);
	});

	describe("with StubHmacEngine", () => {
		it("signs and verifies using StubHmacEngine", () => {
			const signature = hmac.sign("payload-data", options);
			expect(signature).toBe("mock-hmac$payload-data");

			const isValid = hmac.verify(
				"payload-data",
				"mock-hmac$payload-data",
				options,
			);
			expect(isValid).toBe(true);

			const isInvalid = hmac.verify("payload-data", "wrong-signature", options);
			expect(isInvalid).toBe(false);
		});

		it("forwards data and options through sign and its compute alias", () => {
			const sign = vi.spyOn(hmacEngine, "sign");
			expect(hmac.compute("sample", options)).toBe("mock-hmac$sample");
			expect(hmac.sign("sample", options)).toBe("mock-hmac$sample");
			expect(sign).toHaveBeenCalledTimes(2);
			expect(sign).toHaveBeenNthCalledWith(1, "sample", options);
			expect(sign).toHaveBeenNthCalledWith(2, "sample", options);
		});

		it("forwards the expected digest and options through verify", () => {
			const verify = vi.spyOn(hmacEngine, "verify");
			expect(hmac.verify("sample", "mock-hmac$sample", options)).toBe(true);
			expect(verify).toHaveBeenCalledWith(
				"sample",
				"mock-hmac$sample",
				options,
			);
		});

		it("forwards omitted options to the engine", () => {
			const sign = vi.spyOn(hmacEngine, "sign");
			const verify = vi.spyOn(hmacEngine, "verify");
			expect(hmac.sign("sample")).toBe("mock-hmac$sample");
			expect(hmac.compute("sample")).toBe("mock-hmac$sample");
			expect(hmac.verify("sample", "mock-hmac$sample")).toBe(true);
			expect(sign).toHaveBeenCalledWith("sample", undefined);
			expect(verify).toHaveBeenCalledWith(
				"sample",
				"mock-hmac$sample",
				undefined,
			);
		});

		it("allows overriding custom digest and verification result in stub", () => {
			hmacEngine.setCustomDigest("forced-digest");
			expect(hmac.sign("anything", options)).toBe("forced-digest");

			hmacEngine.setVerificationResult(true);
			expect(hmac.verify("data", "any-sig", options)).toBe(true);

			hmacEngine.setVerificationResult(false);
			expect(hmac.verify("data", "any-sig", options)).toBe(false);
		});

		it("supports error injection in stub", () => {
			hmacEngine.setError(new HmacError("Stub failure"));

			expect(() => hmac.sign("data", options)).toThrow("Stub failure");
			expect(() => hmac.compute("data", options)).toThrow("Stub failure");
			expect(() => hmac.verify("data", "sig", options)).toThrow("Stub failure");
		});
	});
});
