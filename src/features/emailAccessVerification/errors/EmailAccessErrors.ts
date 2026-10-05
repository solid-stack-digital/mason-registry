import { EmailAccessVerificationError } from "./EmailAccessVerificationError.js";

export class EmailAccessTokenExpiredError extends EmailAccessVerificationError {
	constructor(message: string = "Email access token has expired") {
		super(message);
		this.name = "EmailAccessTokenExpiredError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessPurposeMismatchError extends EmailAccessVerificationError {
	constructor(message: string = "Email access token purpose mismatch") {
		super(message);
		this.name = "EmailAccessPurposeMismatchError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessEmailMismatchError extends EmailAccessVerificationError {
	constructor(message: string = "Email does not match token email") {
		super(message);
		this.name = "EmailAccessEmailMismatchError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessTokenNotFoundError extends EmailAccessVerificationError {
	constructor(message: string = "Email access token not found") {
		super(message);
		this.name = "EmailAccessTokenNotFoundError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessTokenAlreadyUsedError extends EmailAccessVerificationError {
	constructor(message: string = "Email access token has already been used") {
		super(message);
		this.name = "EmailAccessTokenAlreadyUsedError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessTokenInvalidatedError extends EmailAccessVerificationError {
	constructor(message: string = "Email access token has been invalidated") {
		super(message);
		this.name = "EmailAccessTokenInvalidatedError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class EmailAccessTokenInvalidError extends EmailAccessVerificationError {
	constructor(message: string = "Invalid email access token") {
		super(message);
		this.name = "EmailAccessTokenInvalidError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}
