import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Hmac } from "../Hmac.js";
import type {
	HmacEncoding,
	HmacInput,
	HmacOptions,
	IHmacEngine,
} from "../ports/IHmacEngine.js";

/**
 * Deterministic test stub for IHmacEngine.
 */
@MakeInjectable
export class StubHmacEngine implements IHmacEngine {
	public static deps = {};
	private prefix = "mock-hmac$";
	private customDigest: string | null = null;
	private verificationResult: boolean | null = null;
	private errorToThrow: Error | null = null;

	constructor(public deps: DepsType<typeof StubHmacEngine.deps>) {}

	setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	setPrefix(prefix: string): void {
		this.prefix = prefix;
	}

	setCustomDigest(digest: string | null): void {
		this.customDigest = digest;
	}

	setVerificationResult(result: boolean | null): void {
		this.verificationResult = result;
	}

	sign(data: HmacInput, _secret: HmacInput, _options?: HmacOptions): string {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (this.customDigest !== null) {
			return this.customDigest;
		}
		const dataStr =
			typeof data === "string"
				? data
				: Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
						"utf8",
					);
		return `${this.prefix}${dataStr}`;
	}

	verify(
		data: HmacInput,
		secret: HmacInput,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (this.verificationResult !== null) {
			return this.verificationResult;
		}
		return expectedDigest === this.sign(data, secret, options);
	}

	generateSecret(bytes: number = 32, encoding: HmacEncoding = "hex"): string {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		return `mock-secret-${bytes}-${encoding}`;
	}
}

/**
 * Test stub for Hmac service.
 */
@MakeInjectable
export class StubHmac implements Hmac {
	public static deps = {};
	public readonly stubHmacEngine: StubHmacEngine;
	public deps: { hmacEngine: IHmacEngine };

	constructor(_deps: DepsType<typeof StubHmac.deps>) {
		this.stubHmacEngine = new StubHmacEngine({});
		this.deps = { hmacEngine: this.stubHmacEngine };
	}

	setError(error: Error | null): void {
		this.stubHmacEngine.setError(error);
	}

	setPrefix(prefix: string): void {
		this.stubHmacEngine.setPrefix(prefix);
	}

	setCustomDigest(digest: string | null): void {
		this.stubHmacEngine.setCustomDigest(digest);
	}

	setVerificationResult(result: boolean | null): void {
		this.stubHmacEngine.setVerificationResult(result);
	}

	sign(data: HmacInput, secret: HmacInput, options?: HmacOptions): string {
		return this.stubHmacEngine.sign(data, secret, options);
	}

	compute(data: HmacInput, secret: HmacInput, options?: HmacOptions): string {
		return this.stubHmacEngine.sign(data, secret, options);
	}

	verify(
		data: HmacInput,
		secret: HmacInput,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		return this.stubHmacEngine.verify(data, secret, expectedDigest, options);
	}

	generateSecret(bytes: number = 32, encoding: HmacEncoding = "hex"): string {
		return this.stubHmacEngine.generateSecret(bytes, encoding);
	}
}
