import { JwtError } from "./JwtError.js";

export class TokenExpiredError extends JwtError {
	constructor(
		message: string,
		public readonly expiredAt?: Date,
	) {
		super(message);
	}
}
