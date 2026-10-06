import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getHasherTestContainer } from "./__tests__/utils/getHasherTestContainer.js";
import { Hasher } from "./Hasher.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";
import { IHashEngine } from "./ports/IHashEngine.js";

describe("Hasher", () => {
	let container: Container;
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		container = getHasherTestContainer();
	});
	afterEach(() => vi.unstubAllEnvs());
	describe("with StubHashEngine", () => {
		it("hashes and verifies plain text correctly", async () => {
			const hasher = container.resolve(Hasher);

			const hashed = await hasher.hash("my-secret-password");
			expect(hashed).toBe("mock-hash$my-secret-password");

			const isValid = await hasher.verify("my-secret-password", hashed);
			expect(isValid).toBe(true);

			const isInvalid = await hasher.verify("wrong-password", hashed);
			expect(isInvalid).toBe(false);
		});
	});

	describe("with ScryptHashEngine", () => {
		it("hashes and securely verifies plain text with salt", async () => {
			container.provide(IHashEngine, ScryptHashEngine);
			const hasher = container.resolve(Hasher);

			const hashed = await hasher.hash("secure-pass-123");
			expect(hashed.startsWith("scrypt$")).toBe(true);

			const isValid = await hasher.verify("secure-pass-123", hashed);
			expect(isValid).toBe(true);

			const isInvalid = await hasher.verify("other-pass", hashed);
			expect(isInvalid).toBe(false);
		});

		it("throws when hashing empty string", async () => {
			container.provide(IHashEngine, ScryptHashEngine);
			const hasher = container.resolve(Hasher);

			await expect(hasher.hash("")).rejects.toThrow(
				"Password must be a non-empty string",
			);
		});
	});
});
