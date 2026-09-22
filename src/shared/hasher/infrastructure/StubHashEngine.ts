import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "../Hasher.js";
import type { IHashEngine } from "../ports/IHashEngine.js";

/**
 * In-memory test stub for IHashEngine.
 * Provides predictable hashing and comparison.
 */
@MakeInjectable
export class StubHashEngine implements IHashEngine {
	public static deps = {};
	private prefix = "mock-hash$";
	private errorToThrow: Error | null = null;

	constructor(public deps: DepsType<typeof StubHashEngine.deps>) {}

	setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	setPrefix(prefix: string): void {
		this.prefix = prefix;
	}

	async hash(plain: string): Promise<string> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		return `${this.prefix}${plain}`;
	}

	async verify(plain: string, hashed: string): Promise<boolean> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		return hashed === `${this.prefix}${plain}`;
	}
}

/**
 * Test stub for Hasher service.
 */
@MakeInjectable
export class StubHasher implements Hasher {
	public static deps = {};
	public readonly stubHashEngine: StubHashEngine;
	private readonly internalHasher: Hasher;
	public deps: { hashEngine: IHashEngine };

	constructor(_deps: DepsType<typeof StubHasher.deps>) {
		this.stubHashEngine = new StubHashEngine({});
		this.internalHasher = new Hasher({ hashEngine: this.stubHashEngine });
		this.deps = { hashEngine: this.stubHashEngine };
	}

	setError(error: Error | null): void {
		this.stubHashEngine.setError(error);
	}

	setPrefix(prefix: string): void {
		this.stubHashEngine.setPrefix(prefix);
	}

	async hash(plain: string): Promise<string> {
		return this.internalHasher.hash(plain);
	}

	async verify(plain: string, hashed: string): Promise<boolean> {
		return this.internalHasher.verify(plain, hashed);
	}
}
