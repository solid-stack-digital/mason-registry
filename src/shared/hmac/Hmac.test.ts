import { describe, expect, it } from "vitest";
import { Hmac } from "./Hmac.js";
import { DefaultHmacEngine } from "./infrastructure/DefaultHmacEngine.js";
import { StubHmac, StubHmacEngine } from "./infrastructure/StubHmacEngine.js";

describe("Hmac", () => {
	describe("with StubHmacEngine and StubHmac", () => {
		it("signs and verifies using StubHmacEngine", () => {
			const stubEngine = new StubHmacEngine({});
			const hmac = new Hmac({ hmacEngine: stubEngine });

			const signature = hmac.sign("payload-data", "secret-key");
			expect(signature).toBe("mock-hmac$payload-data");

			const isValid = hmac.verify(
				"payload-data",
				"secret-key",
				"mock-hmac$payload-data",
			);
			expect(isValid).toBe(true);

			const isInvalid = hmac.verify(
				"payload-data",
				"secret-key",
				"wrong-signature",
			);
			expect(isInvalid).toBe(false);
		});

		it("supports compute alias on StubHmac", () => {
			const stubHmac = new StubHmac({});
			expect(stubHmac.compute("sample", "secret")).toBe("mock-hmac$sample");
			expect(stubHmac.sign("sample", "secret")).toBe("mock-hmac$sample");
		});

		it("allows overriding custom digest and verification result in stub", () => {
			const stub = new StubHmac({});
			stub.setCustomDigest("forced-digest");
			expect(stub.sign("anything", "secret")).toBe("forced-digest");

			stub.setVerificationResult(true);
			expect(stub.verify("data", "secret", "any-sig")).toBe(true);

			stub.setVerificationResult(false);
			expect(stub.verify("data", "secret", "any-sig")).toBe(false);
		});

		it("supports error injection in stub", () => {
			const stub = new StubHmac({});
			stub.setError(new Error("Stub failure"));

			expect(() => stub.sign("data", "secret")).toThrow("Stub failure");
			expect(() => stub.verify("data", "secret", "sig")).toThrow(
				"Stub failure",
			);
			expect(() => stub.generateSecret()).toThrow("Stub failure");
		});

		it("generates mock secrets", () => {
			const stub = new StubHmac({});
			expect(stub.generateSecret(16, "hex")).toBe("mock-secret-16-hex");
		});
	});

	describe("with DefaultHmacEngine", () => {
		const engine = new DefaultHmacEngine({});
		const hmac = new Hmac({ hmacEngine: engine });

		it("signs data matching RFC 4231 test vector 1", () => {
			const key = Buffer.from(
				"0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b",
				"hex",
			);
			const data = "Hi There";
			const digest = hmac.sign(data, key, { algorithm: "sha256" });

			expect(digest).toBe(
				"b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7",
			);
			expect(hmac.compute(data, key, { algorithm: "sha256" })).toBe(digest);
		});

		it("signs data matching RFC 4231 test vector 2", () => {
			const key = "Jefe";
			const data = "what do ya want for nothing?";
			const digest = hmac.sign(data, key, { algorithm: "sha256" });

			expect(digest).toBe(
				"5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
			);
		});

		it("verifies matching signatures securely and rejects invalid ones", () => {
			const secret = "top-secret-signing-key";
			const data = JSON.stringify({ userId: "user-123", role: "admin" });

			const signature = hmac.sign(data, secret);
			expect(hmac.verify(data, secret, signature)).toBe(true);

			// Tampered data
			const tamperedData = JSON.stringify({
				userId: "user-123",
				role: "superadmin",
			});
			expect(hmac.verify(tamperedData, secret, signature)).toBe(false);

			// Wrong secret
			expect(hmac.verify(data, "wrong-secret", signature)).toBe(false);

			// Tampered signature
			expect(hmac.verify(data, secret, `${signature}ab`)).toBe(false);
			expect(hmac.verify(data, secret, "invalid-hex")).toBe(false);
			expect(hmac.verify(data, secret, "")).toBe(false);
		});

		it("supports base64 and base64url encodings", () => {
			const secret = "secret-key";
			const data = "hello-world";

			const hexSig = hmac.sign(data, secret, { encoding: "hex" });
			const b64Sig = hmac.sign(data, secret, { encoding: "base64" });
			const b64urlSig = hmac.sign(data, secret, { encoding: "base64url" });

			expect(hexSig).toMatch(/^[0-9a-f]+$/);
			expect(hmac.verify(data, secret, hexSig, { encoding: "hex" })).toBe(true);
			expect(hmac.verify(data, secret, b64Sig, { encoding: "base64" })).toBe(
				true,
			);
			expect(
				hmac.verify(data, secret, b64urlSig, { encoding: "base64url" }),
			).toBe(true);
		});

		it("generates cryptographically random secrets of specified size", () => {
			const secret32Hex = hmac.generateSecret(32, "hex");
			expect(secret32Hex).toHaveLength(64);

			const secret16Base64 = hmac.generateSecret(16, "base64");
			expect(Buffer.from(secret16Base64, "base64")).toHaveLength(16);

			const secret32Base64Url = hmac.generateSecret(32, "base64url");
			expect(secret32Base64Url).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it("throws when secret is empty and no environment fallback is present", () => {
			const originalEnv = process.env.HMAC_SECRET;
			delete process.env.HMAC_SECRET;

			try {
				expect(() => hmac.sign("data", "")).toThrow(
					"HMAC secret cannot be empty",
				);
			} finally {
				if (originalEnv !== undefined) {
					process.env.HMAC_SECRET = originalEnv;
				}
			}
		});
	});
});
