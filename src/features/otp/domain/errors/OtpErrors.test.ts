import { describe, expect, it } from "vitest";
import {
	OtpCooldownError,
	OtpError,
	OtpExpiredError,
	OtpInvalidCodeError,
	OtpMaxAttemptsExceededError,
	OtpNotFoundError,
} from "./OtpErrors.js";

describe("OtpErrors Domain Errors", () => {
	it("OtpError should instantiate with message and inherit from Error", () => {
		const err = new OtpError("Base OTP error");
		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpError");
		expect(err.message).toBe("Base OTP error");
	});

	it("OtpExpiredError should default to expected message", () => {
		const err = new OtpExpiredError();
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpExpiredError");
		expect(err.message).toBe("Code expired, please request a new one");

		const customErr = new OtpExpiredError("Custom expired message");
		expect(customErr.message).toBe("Custom expired message");
	});

	it("OtpMaxAttemptsExceededError should default to expected message", () => {
		const err = new OtpMaxAttemptsExceededError();
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpMaxAttemptsExceededError");
		expect(err.message).toBe(
			"Too many failed attempts. This code has been invalidated.",
		);

		const customErr = new OtpMaxAttemptsExceededError("Custom limit message");
		expect(customErr.message).toBe("Custom limit message");
	});

	it("OtpInvalidCodeError should default to expected message", () => {
		const err = new OtpInvalidCodeError();
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpInvalidCodeError");
		expect(err.message).toBe("Invalid code");

		const customErr = new OtpInvalidCodeError("Custom invalid message");
		expect(customErr.message).toBe("Custom invalid message");
	});

	it("OtpCooldownError should default to expected message", () => {
		const err = new OtpCooldownError();
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpCooldownError");
		expect(err.message).toBe(
			"Please wait before requesting another OTP. Retry cooldown is in effect.",
		);

		const customErr = new OtpCooldownError("Custom cooldown");
		expect(customErr.message).toBe("Custom cooldown");
	});

	it("OtpNotFoundError should default to expected message", () => {
		const err = new OtpNotFoundError();
		expect(err).toBeInstanceOf(OtpError);
		expect(err.name).toBe("OtpNotFoundError");
		expect(err.message).toBe("Invalid code");

		const customErr = new OtpNotFoundError("Custom not found");
		expect(customErr.message).toBe("Custom not found");
	});
});
