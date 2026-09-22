import { describe, expect, it } from "vitest";
import { AuthnConfigToken } from "./tokens.js";

describe("authn tokens", () => {
	it("exports AuthnConfigToken", () => {
		expect(AuthnConfigToken).toBeDefined();
	});
});
