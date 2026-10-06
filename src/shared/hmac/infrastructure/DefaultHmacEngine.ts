import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { HmacError } from "../errors/HmacError.js";
import type {
	HmacData,
	HmacEncoding,
	HmacOptions,
	IHmacEngine,
} from "../ports/IHmacEngine.js";

/**
 * Production implementation of IHmacEngine using node:crypto.
 * Uses UTF-8 strings for both message data and the explicit secret.
 */
@MakeInjectable
export class DefaultHmacEngine implements IHmacEngine {
	public static deps = {};

	constructor(public deps: DepsType<typeof DefaultHmacEngine.deps>) {}

	private validateSecret(secret?: string): string {
		if (typeof secret !== "string" || secret.length === 0) {
			throw new HmacError("HMAC secret cannot be empty");
		}

		return secret;
	}

	sign(data: HmacData, options?: HmacOptions): string {
		const key = this.validateSecret(options?.secret);
		if (typeof data !== "string") {
			throw new HmacError("HMAC data must be a string");
		}

		const algorithm = options?.algorithm ?? "sha256";
		const encoding = options?.encoding ?? "hex";

		if (!["hex", "base64", "base64url"].includes(encoding)) {
			throw new HmacError("Unsupported HMAC encoding");
		}
		try {
			return createHmac(algorithm, key).update(data, "utf8").digest(encoding);
		} catch (cause) {
			throw new HmacError("Failed to sign HMAC data", { cause });
		}
	}

	verify(
		data: HmacData,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		if (typeof expectedDigest !== "string" || !expectedDigest) {
			return false;
		}
		let computedDigest: string;
		try {
			computedDigest = this.sign(data, options);
		} catch {
			return false;
		}
		const computedBuf = Buffer.from(computedDigest);
		const expectedBuf = Buffer.from(expectedDigest);

		if (computedBuf.length !== expectedBuf.length) {
			return false;
		}

		return timingSafeEqual(computedBuf, expectedBuf);
	}

	generateSecret(length = 32, encoding: HmacEncoding = "hex"): string {
		if (!Number.isSafeInteger(length) || length <= 0) {
			throw new HmacError("Byte length must be a positive safe integer");
		}
		if (!["hex", "base64", "base64url"].includes(encoding)) {
			throw new HmacError("Unsupported HMAC encoding");
		}
		try {
			return randomBytes(length).toString(encoding);
		} catch (cause) {
			throw new HmacError("Failed to generate HMAC secret", { cause });
		}
	}
}
