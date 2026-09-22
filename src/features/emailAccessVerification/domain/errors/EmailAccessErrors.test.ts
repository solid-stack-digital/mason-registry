import { describe, expect, it } from "vitest";
import {
	EmailAccessEmailMismatchError,
	EmailAccessPurposeMismatchError,
	EmailAccessTokenAlreadyUsedError,
	EmailAccessTokenExpiredError,
	EmailAccessTokenInvalidatedError,
	EmailAccessTokenInvalidError,
	EmailAccessTokenNotFoundError,
} from "./EmailAccessErrors.js";

describe("EmailAccessErrors", () => {
	it("should create instances with proper names and messages", () => {
		const err1 = new EmailAccessTokenExpiredError();
		expect(err1.name).toBe("EmailAccessTokenExpiredError");
		expect(err1.message).toBe("Email access token has expired");
		expect(err1).toBeInstanceOf(Error);

		const err2 = new EmailAccessPurposeMismatchError();
		expect(err2.name).toBe("EmailAccessPurposeMismatchError");

		const err3 = new EmailAccessEmailMismatchError();
		expect(err3.name).toBe("EmailAccessEmailMismatchError");

		const err4 = new EmailAccessTokenNotFoundError();
		expect(err4.name).toBe("EmailAccessTokenNotFoundError");

		const err5 = new EmailAccessTokenAlreadyUsedError();
		expect(err5.name).toBe("EmailAccessTokenAlreadyUsedError");

		const err6 = new EmailAccessTokenInvalidatedError();
		expect(err6.name).toBe("EmailAccessTokenInvalidatedError");

		const err7 = new EmailAccessTokenInvalidError();
		expect(err7.name).toBe("EmailAccessTokenInvalidError");
	});
});
