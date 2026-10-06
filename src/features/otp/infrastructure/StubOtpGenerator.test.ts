import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IOtpGenerator } from "@/features/otp/domain/IOtpGenerator.js";
import { getOtpTestContainer } from "../__tests__/utils/getOtpTestContainer.js";
import { NextOtp, StubOtpGenerator } from "./StubOtpGenerator.js";

describe("StubOtpGenerator", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getOtpTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provideValue(NextOtp, "123456");
		container.provide(IOtpGenerator, StubOtpGenerator);
		container.provideValue(NextOtp, "123456");
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	it("should return default nextOtp when standard token provided", () => {
		const stub = container.resolve(StubOtpGenerator);
		expect(stub.generate()).toBe("123456");
	});

	it("should return nextOtp configured via NextOtp token", () => {
		container.provideValue(NextOtp, "777888");
		const stub = container.resolve(StubOtpGenerator);
		expect(stub.generate()).toBe("777888");
	});

	it("should allow mutating nextOtp dynamically via setNextOtp", () => {
		const stub = container.resolve(StubOtpGenerator);
		stub.setNextOtp("555444");
		expect(stub.generate()).toBe("555444");
	});
});
