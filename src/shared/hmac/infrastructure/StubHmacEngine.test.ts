import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { HmacError } from "../errors/HmacError.js";
import { StubHmacEngine } from "./StubHmacEngine.js";

describe("StubHmacEngine", () => {
	let engine: StubHmacEngine;
	const options = { secret: "secret" };
	beforeEach(() => {
		engine = new Container().resolve(StubHmacEngine);
	});

	it("signs and verifies deterministic data", () => {
		expect(engine.sign("test", options)).toBe("mock-hmac$test");
		expect(engine.verify("test", "mock-hmac$test", options)).toBe(true);
		expect(engine.verify("changed", "mock-hmac$test", options)).toBe(false);
		expect(engine.verify("test", "wrong", options)).toBe(false);
		expect(engine.sign("")).toBe("mock-hmac$");
		expect(engine.sign("你好 🔑")).toBe("mock-hmac$你好 🔑");
	});

	it("supports a configurable prefix and resetting custom digests", () => {
		engine.setPrefix("custom#");
		expect(engine.sign("data", options)).toBe("custom#data");
		engine.setCustomDigest("fixed");
		expect(engine.sign("data", options)).toBe("fixed");
		expect(engine.verify("data", "fixed", options)).toBe(true);
		engine.setCustomDigest(null);
		expect(engine.sign("data", options)).toBe("custom#data");
	});

	it("supports forcing and clearing verification results", () => {
		engine.setVerificationResult(true);
		expect(engine.verify("data", "wrong", options)).toBe(true);
		engine.setVerificationResult(false);
		expect(engine.verify("data", "mock-hmac$data", options)).toBe(false);
		engine.setVerificationResult(null);
		expect(engine.verify("data", "mock-hmac$data", options)).toBe(true);
	});

	it("throws configured errors before overrides and supports clearing them", () => {
		const error = new HmacError("simulated failure");
		engine.setCustomDigest("fixed");
		engine.setVerificationResult(true);
		engine.setError(error);
		expect(() => engine.sign("data", options)).toThrow(error);
		expect(() => engine.verify("data", "fixed", options)).toThrow(error);
		expect(() => engine.generateSecret()).toThrow(error);
		engine.setError(null);
		expect(engine.sign("data", options)).toBe("fixed");
		expect(engine.verify("data", "fixed", options)).toBe(true);
		expect(engine.generateSecret()).toBe("mock-secret-32-hex");
	});

	it("generates predictable secrets", () => {
		expect(engine.generateSecret()).toBe("mock-secret-32-hex");
		expect(engine.generateSecret(64, "base64")).toBe("mock-secret-64-base64");
		expect(engine.generateSecret(16, "base64url")).toBe(
			"mock-secret-16-base64url",
		);
	});

	it("isolates mutable state between containers", () => {
		engine.setPrefix("changed");
		engine.setError(new HmacError("failure"));
		const other = new Container().resolve(StubHmacEngine);
		expect(other.sign("data", options)).toBe("mock-hmac$data");
	});
});
