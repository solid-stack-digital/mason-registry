import { type DepsType, MakeInjectable } from "@solid-stack/di";
import jsonwebtoken from "jsonwebtoken";
import { Clock } from "@/shared/time/Clock.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { SecretToken } from "../configs/SecretToken.js";
import { JwtError } from "../errors/JwtError.js";
import { TokenExpiredError } from "../errors/TokenExpiredError.js";
import { TokenIntegrityError } from "../errors/TokenIntegrityError.js";
import type { IJwtEngine } from "../ports/IJwtEngine.js";

/** HS256 JWT adapter using jsonwebtoken and an injected clock and secret. */
@MakeInjectable
export class JwtEngine implements IJwtEngine {
	public static deps = { clock: Clock, secret: SecretToken };

	constructor(public deps: DepsType<typeof JwtEngine.deps>) {}

	async sign(payload: unknown, ttl: Duration): Promise<string> {
		this.validateSecret();
		if (!(ttl instanceof Duration) || !Number.isFinite(ttl.millis)) {
			throw new JwtError("TTL must be a Duration with finite milliseconds");
		}
		const nowSec = Math.floor(this.deps.clock.now().millis / 1000);
		const fullPayload =
			typeof payload === "object" && payload !== null
				? {
						...payload,
						iat: nowSec,
						exp: nowSec + Math.floor(ttl.millis / 1000),
					}
				: {
						data: payload,
						iat: nowSec,
						exp: nowSec + Math.floor(ttl.millis / 1000),
					};
		try {
			return jsonwebtoken.sign(fullPayload, this.deps.secret, {
				algorithm: "HS256",
			});
		} catch {
			throw new JwtError(
				"Failed to sign JWT: payload must be JSON serializable with valid claims",
			);
		}
	}

	async verify<T = unknown>(
		token: string,
		options?: { ignoreExpiration?: boolean },
	): Promise<T> {
		this.validateSecret();
		if (typeof token !== "string" || !token) {
			throw new TokenIntegrityError("Token is required and must be a string");
		}
		try {
			const decoded = jsonwebtoken.verify(token, this.deps.secret, {
				algorithms: ["HS256"],
				clockTimestamp: Math.floor(this.deps.clock.now().millis / 1000),
				ignoreExpiration: options?.ignoreExpiration ?? false,
				complete: true,
			});
			if (decoded.header.typ !== "JWT") {
				throw new TokenIntegrityError("Unsupported token header");
			}
			const payload = decoded.payload;
			if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
				throw new TokenIntegrityError("Token payload must be an object");
			}
			if (
				payload.exp !== undefined &&
				(typeof payload.exp !== "number" || !Number.isFinite(payload.exp))
			) {
				throw new TokenIntegrityError("Invalid token expiration");
			}
			return payload as T;
		} catch (error) {
			if (error instanceof jsonwebtoken.TokenExpiredError) {
				throw new TokenExpiredError("Token expired", error.expiredAt);
			}
			if (error instanceof TokenIntegrityError) {
				throw error;
			}
			throw new TokenIntegrityError(
				"Invalid token signature, claims, or structure",
			);
		}
	}

	private validateSecret(): void {
		if (typeof this.deps.secret !== "string" || !this.deps.secret) {
			throw new JwtError("JWT secret must be a non-empty string");
		}
	}
}
