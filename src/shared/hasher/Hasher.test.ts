import { describe, expect, it } from "vitest";
import { Hasher } from "./Hasher.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";
import { StubHashEngine } from "./infrastructure/StubHashEngine.js";

describe("Hasher", () => {
	describe("with StubHashEngine", () => {
		it("hashes and verifies plain text correctly", async () => {
			const stub = new StubHashEngine({});
			const hasher = new Hasher({ hashEngine: stub });

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
			const engine = new ScryptHashEngine({});
			const hasher = new Hasher({ hashEngine: engine });

			const hashed = await hasher.hash("secure-pass-123");
			expect(hashed.startsWith("scrypt$")).toBe(true);

			const isValid = await hasher.verify("secure-pass-123", hashed);
			expect(isValid).toBe(true);

			const isInvalid = await hasher.verify("other-pass", hashed);
			expect(isInvalid).toBe(false);
		});

		it("throws when hashing empty string", async () => {
			const engine = new ScryptHashEngine({});
			const hasher = new Hasher({ hashEngine: engine });

			await expect(hasher.hash("")).rejects.toThrow(
				"Password must be a non-empty string",
			);
		});
	});
});
