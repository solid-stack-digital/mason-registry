import { createHmac } from "node:crypto";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { TokenExpiredError } from "../errors/TokenExpiredError.js";
import { TokenIntegrityError } from "../errors/TokenIntegrityError.js";
import type { IJwtEngine } from "../ports/IJwtEngine.js";

function base64UrlEncode(str: string | Buffer): string {
	const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
	return buf
		.toString("base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
	let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	while (base64.length % 4) {
		base64 += "=";
	}
	return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Production implementation of IJwtEngine using HMAC SHA256.
 */
@MakeInjectable
export class HmacJwtEngine implements IJwtEngine {
	public static deps = {
		clock: Clock,
	};

	private readonly secret: string =
		process.env.JWT_SECRET || "default-internal-pmis-jwt-secret-key-1234567890";

	constructor(public deps: DepsType<typeof HmacJwtEngine.deps>) {}

	async sign(payload: unknown, ttl: Duration): Promise<string> {
		if (!ttl || !(ttl instanceof Duration)) {
			throw new Error("TTL must be an instance of Duration");
		}

		const header = { alg: "HS256", typ: "JWT" };
		const nowSec = Math.floor(this.deps.clock.now().millis / 1000);
		const expSec = nowSec + Math.floor(ttl.millis / 1000);

		const fullPayload =
			typeof payload === "object" && payload !== null
				? { ...payload, iat: nowSec, exp: expSec }
				: { data: payload, iat: nowSec, exp: expSec };

		const encodedHeader = base64UrlEncode(JSON.stringify(header));
		const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

		const signature = createHmac("sha256", this.secret)
			.update(`${encodedHeader}.${encodedPayload}`)
			.digest();
		const encodedSignature = base64UrlEncode(signature);

		return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
	}

	async verify<T = unknown>(
		token: string,
		options?: { ignoreExpiration?: boolean },
	): Promise<T> {
		if (!token || typeof token !== "string") {
			throw new TokenIntegrityError("Token is required and must be a string");
		}

		const parts = token.split(".");
		if (parts.length !== 3) {
			throw new TokenIntegrityError(
				"Invalid token structure (expected 3 parts)",
			);
		}

		const [headerB64, payloadB64, sigB64] = parts;
		if (!headerB64 || !payloadB64 || !sigB64) {
			throw new TokenIntegrityError("Token parts cannot be empty");
		}

		const expectedSig = base64UrlEncode(
			createHmac("sha256", this.secret)
				.update(`${headerB64}.${payloadB64}`)
				.digest(),
		);

		if (sigB64 !== expectedSig) {
			throw new TokenIntegrityError("Invalid token signature");
		}

		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(base64UrlDecode(payloadB64)) as Record<
				string,
				unknown
			>;
		} catch {
			throw new TokenIntegrityError("Malformed token payload");
		}

		if (!options?.ignoreExpiration && typeof payload.exp === "number") {
			const nowSec = Math.floor(this.deps.clock.now().millis / 1000);
			const isoTimeExp = new Date(payload.exp * 1000);
			if (nowSec >= payload.exp) {
				throw new TokenExpiredError("Token expired", isoTimeExp);
			}
		}

		return payload as T;
	}
}
