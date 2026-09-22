import { JwtError } from "./JwtError.js";

export class TokenIntegrityError extends JwtError {
	constructor(message: string) {
		super(message);
	}
}
