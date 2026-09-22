export class OtpError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "OtpError";
	}
}

export class OtpExpiredError extends OtpError {
	constructor(message = "Code expired, please request a new one") {
		super(message);
		this.name = "OtpExpiredError";
	}
}

export class OtpMaxAttemptsExceededError extends OtpError {
	constructor(
		message = "Too many failed attempts. This code has been invalidated.",
	) {
		super(message);
		this.name = "OtpMaxAttemptsExceededError";
	}
}

export class OtpInvalidCodeError extends OtpError {
	constructor(message = "Invalid code") {
		super(message);
		this.name = "OtpInvalidCodeError";
	}
}

export class OtpCooldownError extends OtpError {
	constructor(
		message = "Please wait before requesting another OTP. Retry cooldown is in effect.",
	) {
		super(message);
		this.name = "OtpCooldownError";
	}
}

export class OtpNotFoundError extends OtpError {
	constructor(message = "Invalid code") {
		super(message);
		this.name = "OtpNotFoundError";
	}
}
