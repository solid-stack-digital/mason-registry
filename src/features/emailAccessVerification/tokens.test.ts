import { ValueToken } from "@solid-stack/di";
import { describe, expect, it } from "vitest";
import { EmailAccessConfigToken } from "./tokens.js";

describe("EmailAccessTokens", () => {
	it("EmailAccessConfigToken should be defined as a ValueToken subclass", () => {
		expect(EmailAccessConfigToken).toBeDefined();
		expect(EmailAccessConfigToken.prototype).toBeInstanceOf(ValueToken);
	});
});
