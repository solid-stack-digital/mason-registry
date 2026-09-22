import { ValueToken } from "@solid-stack/di";
import { describe, expect, it } from "vitest";
import { OtpConfigToken } from "./tokens.js";

describe("Otp Tokens", () => {
	it("OtpConfigToken should be an instance/subclass of ValueToken", () => {
		expect(OtpConfigToken).toBeDefined();
		expect(OtpConfigToken.prototype).toBeInstanceOf(ValueToken);
	});
});
