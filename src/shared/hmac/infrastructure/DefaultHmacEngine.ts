import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	HmacEncoding,
	HmacInput,
	HmacOptions,
	IHmacEngine,
} from "../ports/IHmacEngine.js";

/**
 * Production implementation of IHmacEngine using node:crypto.
 */
@MakeInjectable
export class DefaultHmacEngine implements IHmacEngine {
	public static deps = {};

	constructor(public deps: DepsType<typeof DefaultHmacEngine.deps>) {}

	private resolveSecret(secret: HmacInput): HmacInput {
		if (typeof secret === "string" && secret.length === 0) {
			const envSecret = process.env.HMAC_SECRET;
			if (envSecret && envSecret.length > 0) {
				return envSecret;
			}
			throw new Error("HMAC secret cannot be empty");
		}
		if (!secret) {
			const envSecret = process.env.HMAC_SECRET;
			if (envSecret && envSecret.length > 0) {
				return envSecret;
			}
			throw new Error("HMAC secret cannot be empty");
		}
		return secret;
	}

	sign(data: HmacInput, secret: HmacInput, options?: HmacOptions): string {
		const key = this.resolveSecret(secret);
		if (data === undefined || data === null) {
			throw new Error("HMAC data cannot be null or undefined");
		}

		const algorithm = options?.algorithm ?? "sha256";
		const encoding = options?.encoding ?? "hex";

		const hmac = createHmac(algorithm, key);
		hmac.update(data);
		return hmac.digest(encoding);
	}

	verify(
		data: HmacInput,
		secret: HmacInput,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		if (typeof expectedDigest !== "string" || expectedDigest.length === 0) {
			return false;
		}

		try {
			const computed = this.sign(data, secret, options);
			const encoding = options?.encoding ?? "hex";

			const expectedBuf = Buffer.from(expectedDigest, encoding);
			const computedBuf = Buffer.from(computed, encoding);

			if (expectedBuf.length !== computedBuf.length) {
				return false;
			}

			return timingSafeEqual(expectedBuf, computedBuf);
		} catch {
			return false;
		}
	}

	generateSecret(bytes: number = 32, encoding: HmacEncoding = "hex"): string {
		if (bytes <= 0) {
			throw new Error("Byte length must be greater than 0");
		}
		const buf = randomBytes(bytes);
		return buf.toString(encoding);
	}
}
