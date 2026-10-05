import { describe, expect, it } from "vitest";
import {
	AccountAlreadyExistsError,
	AccountAlreadyVerifiedError,
	AccountNotFoundError,
	AccountNotVerifiedError,
	DeviceMismatchError,
	InvalidCredentialsError,
	InvalidEmailError,
	InvalidTokenError,
	PasswordMismatchError,
	RefreshTokenExpiredError,
	RefreshTokenNotFoundError,
	WeakPasswordError,
} from "./AuthnErrors.js";

describe("AuthnErrors", () => {
	it("instantiates errors with expected default messages", () => {
		expect(new InvalidCredentialsError().message).toBe(
			"Invalid email or password",
		);
		expect(new AccountNotVerifiedError().message).toContain(
			"Email has not been verified",
		);
		expect(new AccountAlreadyExistsError().message).toContain("already exists");
		expect(new AccountNotFoundError().message).toBe("Account not found");
		expect(new AccountAlreadyVerifiedError().message).toContain(
			"already verified",
		);
		expect(new RefreshTokenNotFoundError().message).toContain(
			"unrecognized refresh token",
		);
		expect(new RefreshTokenExpiredError().message).toContain("has expired");
		expect(new DeviceMismatchError().message).toContain("Client device ID");
		expect(new PasswordMismatchError().message).toBe(
			"Incorrect current password",
		);
		expect(new WeakPasswordError().message).toContain("at least 8 characters");
		expect(new InvalidEmailError().message).toBe("A valid email is required");
		expect(new InvalidTokenError().message).toContain(
			"Invalid or rejected email access token",
		);
	});
});
