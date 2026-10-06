import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	HmacData,
	HmacEncoding,
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

	sign(data: HmacData, _options?: HmacOptions): string {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (this.customDigest !== null) {
			return this.customDigest;
		}
		return `${this.prefix}${data}`;
	}

	verify(
		data: HmacData,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (this.verificationResult !== null) {
			return this.verificationResult;
		}
		return expectedDigest === this.sign(data, options);
	}

	generateSecret(bytes: number = 32, encoding: HmacEncoding = "hex"): string {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		return `mock-secret-${bytes}-${encoding}`;
	}
}
