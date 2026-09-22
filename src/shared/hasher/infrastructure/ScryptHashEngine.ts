import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { IHashEngine } from "../ports/IHashEngine.js";

const scryptAsync = promisify(scrypt);

/**
 * Production implementation of IHashEngine using scrypt KDF with random salt.
 */
@MakeInjectable
export class ScryptHashEngine implements IHashEngine {
	public static deps = {};
	private readonly keyLength = 64;

	constructor(public deps: DepsType<typeof ScryptHashEngine.deps>) {}

	async hash(plain: string): Promise<string> {
		if (typeof plain !== "string" || plain.length === 0) {
			throw new Error("Password must be a non-empty string");
		}

		const salt = randomBytes(16).toString("hex");
		const derivedKey = (await scryptAsync(
			plain,
			salt,
			this.keyLength,
		)) as Buffer;
		return `scrypt$${salt}$${derivedKey.toString("hex")}`;
	}

	async verify(plain: string, hashed: string): Promise<boolean> {
		try {
			if (typeof hashed !== "string" || typeof plain !== "string") {
				return false;
			}

			const parts = hashed.split("$");
			if (parts.length !== 3 || parts[0] !== "scrypt") {
				return false;
			}

			const salt = parts[1];
			const storedKeyHex = parts[2];
			if (
				!salt ||
				!storedKeyHex ||
				storedKeyHex.length !== this.keyLength * 2
			) {
				return false;
			}

			const storedBuffer = Buffer.from(storedKeyHex, "hex");
			const derivedKey = (await scryptAsync(
				plain,
				salt,
				this.keyLength,
			)) as Buffer;

			if (storedBuffer.length !== derivedKey.length) {
				return false;
			}

			return timingSafeEqual(storedBuffer, derivedKey);
		} catch {
			return false;
		}
	}
}
