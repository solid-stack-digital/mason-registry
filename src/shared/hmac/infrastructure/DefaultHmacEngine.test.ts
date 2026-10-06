import { createHmac } from "node:crypto";
import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { HmacError } from "../errors/HmacError.js";
import type { HmacEncoding, HmacOptions } from "../ports/IHmacEngine.js";
import { DefaultHmacEngine } from "./DefaultHmacEngine.js";

describe("DefaultHmacEngine", () => {
	let engine: DefaultHmacEngine;
	const options = { secret: "Jefe" };
	beforeEach(() => {
		engine = new Container().resolve(DefaultHmacEngine);
	});

	it("matches RFC 4231 SHA-256 vector 2", () => {
		expect(engine.sign("what do ya want for nothing?", options)).toBe(
			"5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
		);
	});

	it.each(["", "hello", "你好 🔑"])("signs UTF-8 data %j", (data) => {
		expect(engine.sign(data, options)).toBe(
			createHmac("sha256", options.secret).update(data, "utf8").digest("hex"),
		);
	});

	it.each(["sha224", "sha256", "sha384", "sha512", "sha1"])(
		"supports %s",
		(algorithm) => {
			expect(engine.sign("data", { ...options, algorithm })).toBe(
				createHmac(algorithm, options.secret).update("data").digest("hex"),
			);
		},
	);

	it.each<HmacEncoding>(["hex", "base64", "base64url"])(
		"verifies %s signatures",
		(encoding) => {
			const config = { ...options, encoding };
			const digest = engine.sign("data", config);
			expect(digest).toBe(
				createHmac("sha256", options.secret).update("data").digest(encoding),
			);
			expect(engine.verify("data", digest, config)).toBe(true);
			expect(engine.verify("changed", digest, config)).toBe(false);
			expect(
				engine.verify("data", digest, { ...config, secret: "wrong" }),
			).toBe(false);
			expect(engine.verify("data", digest.slice(1), config)).toBe(false);
			expect(engine.verify("data", `${digest}x`, config)).toBe(false);
			expect(engine.verify("data", `!${digest.slice(1)}`, config)).toBe(false);
		},
	);

	it.each([undefined, null, "", 42])("rejects invalid secrets %j", (secret) => {
		const config = { secret } as unknown as HmacOptions;
		expect(() => engine.sign("data", config)).toThrow(HmacError);
		expect(engine.verify("data", "digest", config)).toBe(false);
	});

	it("requires an explicit secret", () => {
		expect(() => engine.sign("data")).toThrow(HmacError);
		expect(engine.verify("data", "digest")).toBe(false);
	});

	it.each([undefined, null, 42, Buffer.from("data")])(
		"rejects non-string data",
		(data) => {
			expect(() => engine.sign(data as unknown as string, options)).toThrow(
				HmacError,
			);
			expect(engine.verify(data as unknown as string, "digest", options)).toBe(
				false,
			);
		},
	);

	it.each([undefined, null, "", 42])("rejects invalid digests %j", (digest) => {
		expect(engine.verify("data", digest as unknown as string, options)).toBe(
			false,
		);
	});

	it("translates unsupported algorithm errors", () => {
		const config = { ...options, algorithm: "invalid-algorithm" };
		expect(() => engine.sign("data", config)).toThrow(HmacError);
		expect(engine.verify("data", "digest", config)).toBe(false);
	});

	it("rejects unsupported encodings", () => {
		const encoding = "utf8" as HmacEncoding;
		expect(() => engine.sign("data", { ...options, encoding })).toThrow(
			HmacError,
		);
		expect(() => engine.generateSecret(32, encoding)).toThrow(HmacError);
	});

	it.each<HmacEncoding>(["hex", "base64", "base64url"])(
		"generates random %s secrets",
		(encoding) => {
			const secrets = Array.from({ length: 32 }, () =>
				engine.generateSecret(24, encoding),
			);
			expect(new Set(secrets).size).toBe(32);
			for (const secret of secrets) {
				expect(Buffer.from(secret, encoding)).toHaveLength(24);
				expect(Buffer.from(secret, encoding).toString(encoding)).toBe(secret);
			}
		},
	);

	it("defaults to 32 bytes encoded as hex", () => {
		expect(engine.generateSecret()).toMatch(/^[0-9a-f]{64}$/);
	});

	it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		"rejects invalid byte lengths %s",
		(bytes) => {
			expect(() => engine.generateSecret(bytes)).toThrow(HmacError);
		},
	);

	it("translates crypto errors for unsupported byte sizes", () => {
		expect(() => engine.generateSecret(Number.MAX_SAFE_INTEGER)).toThrow(
			HmacError,
		);
	});
});
