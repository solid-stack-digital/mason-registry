export class InvalidCredentialsError extends Error {
	constructor(message = "Invalid email or password") {
		super(message);
		this.name = "InvalidCredentialsError";
	}
}

export class AccountNotVerifiedError extends Error {
	constructor(
		message = "Email has not been verified. Please verify your email before logging in",
	) {
		super(message);
		this.name = "AccountNotVerifiedError";
	}
}

export class AccountAlreadyExistsError extends Error {
	constructor(message = "An account with this email already exists") {
		super(message);
		this.name = "AccountAlreadyExistsError";
	}
}

export class AccountNotFoundError extends Error {
	constructor(message = "Account not found") {
		super(message);
		this.name = "AccountNotFoundError";
	}
}

export class AccountAlreadyVerifiedError extends Error {
	constructor(message = "Email is already verified") {
		super(message);
		this.name = "AccountAlreadyVerifiedError";
	}
}

export class RefreshTokenNotFoundError extends Error {
	constructor(message = "Invalid or unrecognized refresh token") {
		super(message);
		this.name = "RefreshTokenNotFoundError";
	}
}

export class RefreshTokenExpiredError extends Error {
	constructor(message = "Refresh token has expired") {
		super(message);
		this.name = "RefreshTokenExpiredError";
	}
}

export class DeviceMismatchError extends Error {
	constructor(
		message = "Client device ID does not match the token's bound device",
	) {
		super(message);
		this.name = "DeviceMismatchError";
	}
}

export class PasswordMismatchError extends Error {
	constructor(message = "Incorrect current password") {
		super(message);
		this.name = "PasswordMismatchError";
	}
}

export class WeakPasswordError extends Error {
	constructor(message = "Password must be at least 8 characters") {
		super(message);
		this.name = "WeakPasswordError";
	}
}

export class InvalidEmailError extends Error {
	constructor(message = "A valid email is required") {
		super(message);
		this.name = "InvalidEmailError";
	}
}

export class InvalidTokenError extends Error {
	constructor(message = "Invalid or rejected email access token") {
		super(message);
		this.name = "InvalidTokenError";
	}
}
