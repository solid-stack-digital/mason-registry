import { describe, expect, it } from "vitest";
import { Hasher } from "../../Hasher.js";
import { ScryptHashEngine } from "../ScryptHashEngine.js";
import { StubHashEngine, StubHasher } from "../StubHashEngine.js";

describe("Hasher Infrastructure & Hasher Service", () => {
	describe("ScryptHashEngine", () => {
		it("hashes and compares passwords correctly", async () => {
			const engine = new ScryptHashEngine({});
			const hash = await engine.hash("my-secret-password");

			expect(hash).toBeDefined();
			expect(hash.startsWith("scrypt$")).toBe(true);

			const isValid = await engine.compare(hash, "my-secret-password");
			expect(isValid).toBe(true);

			const isInvalid = await engine.compare(hash, "wrong-password");
			expect(isInvalid).toBe(false);
		});

		it("generates unique hashes for identical passwords due to salt", async () => {
			const engine = new ScryptHashEngine({});
			const hash1 = await engine.hash("same-password");
			const hash2 = await engine.hash("same-password");

			expect(hash1).not.toBe(hash2);
			expect(await engine.compare(hash1, "same-password")).toBe(true);
			expect(await engine.compare(hash2, "same-password")).toBe(true);
		});

		it("verifies plaintext against hash via verify()", async () => {
			const engine = new ScryptHashEngine({});
			const hash = await engine.hash("admin-pass");

			expect(await engine.verify("admin-pass", hash)).toBe(true);
			expect(await engine.verify("wrong-pass", hash)).toBe(false);
		});

		it("rejects empty or non-string inputs in hash()", async () => {
			const engine = new ScryptHashEngine({});

			await expect(engine.hash("")).rejects.toThrow(
				"Password must be a non-empty string",
			);
			await expect(engine.hash(null as unknown as string)).rejects.toThrow(
				"Password must be a non-empty string",
			);
		});

		it("handles malformed hashes gracefully in compare()", async () => {
			const engine = new ScryptHashEngine({});

			expect(await engine.compare("invalid-hash", "password")).toBe(false);
			expect(await engine.compare("scrypt$only-salt", "password")).toBe(false);
			expect(await engine.compare("bcrypt$salt$hash", "password")).toBe(false);
			expect(await engine.compare(null as unknown as string, "password")).toBe(
				false,
			);
			expect(await engine.compare("scrypt$salt$badhex", "password")).toBe(
				false,
			);
		});
	});

	describe("StubHashEngine", () => {
		it("provides predictable hashing and comparison", async () => {
			const stub = new StubHashEngine({});
			const hash = await stub.hash("test-password");

			expect(hash).toBe("mock-hash$test-password");
			expect(await stub.compare(hash, "test-password")).toBe(true);
			expect(await stub.compare(hash, "other")).toBe(false);
			expect(await stub.verify("test-password", hash)).toBe(true);
		});

		it("allows custom prefix", async () => {
			const stub = new StubHashEngine({});
			stub.setPrefix("custom$");
			const hash = await stub.hash("test");

			expect(hash).toBe("custom$test");
			expect(await stub.compare("custom$test", "test")).toBe(true);
		});

		it("allows setting synthetic errors", async () => {
			const stub = new StubHashEngine({});
			stub.setError(new Error("Database connection lost"));

			await expect(stub.hash("pass")).rejects.toThrow(
				"Database connection lost",
			);
			await expect(stub.compare("mock$pass", "pass")).rejects.toThrow(
				"Database connection lost",
			);
		});
	});

	describe("StubHasher", () => {
		it("functions as Hasher with stub behavior", async () => {
			const stubHasher = new StubHasher({});
			const hash = await stubHasher.hash("hello");

			expect(hash).toBe("mock-hash$hello");
			expect(await stubHasher.compare(hash, "hello")).toBe(true);
			expect(await stubHasher.verify("hello", hash)).toBe(true);
		});

		it("allows setting synthetic errors on StubHasher", async () => {
			const stubHasher = new StubHasher({});
			stubHasher.setError(new Error("Hasher failure"));

			await expect(stubHasher.hash("any")).rejects.toThrow("Hasher failure");
		});
	});

	describe("Hasher Service", () => {
		it("delegates hash, compare, verify to injected hashEngine", async () => {
			const stubEngine = new StubHashEngine({});
			const hasher = new Hasher({ hashEngine: stubEngine });

			const hash = await hasher.hash("plain");
			expect(hash).toBe("mock-hash$plain");

			expect(await hasher.compare(hash, "plain")).toBe(true);
			expect(await hasher.compare(hash, "other")).toBe(false);
			expect(await hasher.verify("plain", hash)).toBe(true);
		});
	});
});
