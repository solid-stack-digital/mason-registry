import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { NextOtp, StubOtpGenerator } from "./StubOtpGenerator.js";

describe("StubOtpGenerator", () => {
	let container: Container;

	beforeEach(() => {
		container = new Container();
		container.provideValue(NextOtp, "123456");
	});

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
