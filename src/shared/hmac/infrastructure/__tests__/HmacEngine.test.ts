import { describe, expect, it } from "vitest";
import { DefaultHmacEngine } from "../DefaultHmacEngine.js";
import { StubHmac, StubHmacEngine } from "../StubHmacEngine.js";

describe("DefaultHmacEngine", () => {
	const engine = new DefaultHmacEngine({});

	describe("sign()", () => {
		it("computes HMAC-SHA256 according to RFC 4231 vector 1", () => {
			const key = Buffer.from(
				"0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				"hex",
			);
			const data = "Hi There";
			const digest = engine.sign(data, key, { algorithm: "sha256" });

			expect(digest).toBe(
				"b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
			);
		});

		it("computes HMAC-SHA256 according to RFC 4231 vector 2", () => {
			const key = "Jefe";
			const data = "what do ya want for nothing?";
			const digest = engine.sign(data, key, { algorithm: "sha256" });

			expect(digest).toBe(
				"5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
			);
		});

		it("computes HMAC-SHA512 according to RFC 4231", () => {
			const key = "Jefe";
			const data = "what do ya want for nothing?";
			const digest = engine.sign(data, key, {
				algorithm: "sha512",
				encoding: "hex",
			});

			expect(digest).toBe(
				"164b7a7bfcf819e2e395fbe73b56e0a387bd64222e831fd610270cd7ea2505549758bf75c05a994a6d034f65f8f0e6fdcaeab1a34d4a6b4b636e070a38bce737",
			);
		});

		it("supports sha384 and sha1 algorithms", () => {
			const sha384 = engine.sign("test", "secret", { algorithm: "sha384" });
			expect(sha384).toHaveLength(96);

			const sha1 = engine.sign("test", "secret", { algorithm: "sha1" });
			expect(sha1).toHaveLength(40);
		});

		it("supports hex, base64, and base64url encodings", () => {
			const data = "data-to-sign";
			const secret = "secret-key";

			const hex = engine.sign(data, secret, { encoding: "hex" });
			const b64 = engine.sign(data, secret, { encoding: "base64" });
			const b64url = engine.sign(data, secret, { encoding: "base64url" });

			expect(hex).toMatch(/^[0-9a-f]+$/);
			expect(b64).toMatch(/^[A-Za-z0-9+/=]+$/);
			expect(b64url).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it("supports Buffer and Uint8Array inputs for data and secret", () => {
			const data = new Uint8Array([1, 2, 3, 4, 5]);
			const secret = Buffer.from("buffer-secret");

			const digest = engine.sign(data, secret);
			expect(typeof digest).toBe("string");
			expect(digest.length).toBe(64);
		});

		it("falls back to process.env.HMAC_SECRET when secret is empty", () => {
			const original = process.env.HMAC_SECRET;
			process.env.HMAC_SECRET = "fallback-secret-from-env";

			try {
				const digestWithEmpty = engine.sign("data", "");
				const digestExplicit = engine.sign("data", "fallback-secret-from-env");
				expect(digestWithEmpty).toBe(digestExplicit);
			} finally {
				if (original !== undefined) {
					process.env.HMAC_SECRET = original;
				} else {
					delete process.env.HMAC_SECRET;
				}
			}
		});

		it("throws when secret is empty and no environment fallback exists", () => {
			const original = process.env.HMAC_SECRET;
			delete process.env.HMAC_SECRET;

			try {
				expect(() => engine.sign("data", "")).toThrow(
					"HMAC secret cannot be empty",
				);
			} finally {
				if (original !== undefined) {
					process.env.HMAC_SECRET = original;
				}
			}
		});

		it("throws when data is null or undefined", () => {
			expect(() => engine.sign(null as unknown as string, "secret")).toThrow(
				"HMAC data cannot be null or undefined",
			);
			expect(() =>
				engine.sign(undefined as unknown as string, "secret"),
			).toThrow("HMAC data cannot be null or undefined");
		});
	});

	describe("verify()", () => {
		const secret = "verify-secret";
		const data = "payload-content";

		it("returns true for matching signature", () => {
			const sig = engine.sign(data, secret);
			expect(engine.verify(data, secret, sig)).toBe(true);
		});

		it("returns false for tampered data or wrong secret", () => {
			const sig = engine.sign(data, secret);
			expect(engine.verify("tampered", secret, sig)).toBe(false);
			expect(engine.verify(data, "wrong-secret", sig)).toBe(false);
		});

		it("returns false for signature with mismatched length without throwing", () => {
			const sig = engine.sign(data, secret);
			expect(engine.verify(data, secret, sig.slice(0, 10))).toBe(false);
			expect(engine.verify(data, secret, `${sig}ffff`)).toBe(false);
		});

		it("returns false for invalid inputs without crashing", () => {
			expect(engine.verify(data, secret, "")).toBe(false);
			expect(engine.verify(data, secret, null as unknown as string)).toBe(
				false,
			);
			expect(engine.verify(data, secret, undefined as unknown as string)).toBe(
				false,
			);
		});
	});

	describe("generateSecret()", () => {
		it("generates random secrets of requested byte length and encoding", () => {
			const s16 = engine.generateSecret(16, "hex");
			expect(s16).toHaveLength(32);

			const s32 = engine.generateSecret(32, "hex");
			expect(s32).toHaveLength(64);

			const s24b64 = engine.generateSecret(24, "base64");
			expect(Buffer.from(s24b64, "base64")).toHaveLength(24);

			const s32url = engine.generateSecret(32, "base64url");
			expect(s32url).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it("throws when bytes is less than or equal to 0", () => {
			expect(() => engine.generateSecret(0)).toThrow(
				"Byte length must be greater than 0",
			);
			expect(() => engine.generateSecret(-5)).toThrow(
				"Byte length must be greater than 0",
			);
		});
	});
});

describe("StubHmacEngine & StubHmac", () => {
	describe("StubHmacEngine", () => {
		it("provides deterministic hashing with default prefix", () => {
			const stub = new StubHmacEngine({});
			expect(stub.sign("test", "secret")).toBe("mock-hmac$test");
			expect(stub.verify("test", "secret", "mock-hmac$test")).toBe(true);
			expect(stub.verify("test", "secret", "wrong")).toBe(false);
		});

		it("supports Uint8Array inputs for data", () => {
			const stub = new StubHmacEngine({});
			const data = Buffer.from("buffer-test");
			expect(stub.sign(data, "secret")).toBe("mock-hmac$buffer-test");
		});

		it("allows changing prefix", () => {
			const stub = new StubHmacEngine({});
			stub.setPrefix("custom-prefix#");
			expect(stub.sign("value", "secret")).toBe("custom-prefix#value");
		});

		it("allows forcing custom digest", () => {
			const stub = new StubHmacEngine({});
			stub.setCustomDigest("forced-fixed-digest");
			expect(stub.sign("any", "any")).toBe("forced-fixed-digest");
		});

		it("allows forcing verification result", () => {
			const stub = new StubHmacEngine({});
			stub.setVerificationResult(true);
			expect(stub.verify("any", "any", "wrong")).toBe(true);

			stub.setVerificationResult(false);
			expect(stub.verify("test", "secret", "mock-hmac$test")).toBe(false);
		});

		it("allows setting synthetic error", () => {
			const stub = new StubHmacEngine({});
			stub.setError(new Error("Engine error"));

			expect(() => stub.sign("a", "b")).toThrow("Engine error");
			expect(() => stub.verify("a", "b", "c")).toThrow("Engine error");
			expect(() => stub.generateSecret()).toThrow("Engine error");
		});

		it("generates mock secrets", () => {
			const stub = new StubHmacEngine({});
			expect(stub.generateSecret(64, "base64")).toBe("mock-secret-64-base64");
		});
	});

	describe("StubHmac", () => {
		it("functions as Hmac service with stub engine methods", () => {
			const stubHmac = new StubHmac({});
			expect(stubHmac.sign("msg", "key")).toBe("mock-hmac$msg");
			expect(stubHmac.compute("msg", "key")).toBe("mock-hmac$msg");
			expect(stubHmac.verify("msg", "key", "mock-hmac$msg")).toBe(true);

			stubHmac.setPrefix("alt$");
			expect(stubHmac.sign("msg", "key")).toBe("alt$msg");

			stubHmac.setCustomDigest("override");
			expect(stubHmac.sign("msg", "key")).toBe("override");

			stubHmac.setVerificationResult(true);
			expect(stubHmac.verify("x", "y", "z")).toBe(true);

			stubHmac.setError(new Error("Hmac error"));
			expect(() => stubHmac.sign("a", "b")).toThrow("Hmac error");
		});
	});
});
