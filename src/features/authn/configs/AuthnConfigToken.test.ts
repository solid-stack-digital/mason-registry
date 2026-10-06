import { describe, expect, it } from "vitest";
import { AuthnConfigToken } from "./AuthnConfigToken.js";

describe("authn tokens", () => {
	it("exports AuthnConfigToken", () => {
		expect(AuthnConfigToken).toBeDefined();
	});
});
