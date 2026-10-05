import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Duration } from "@/shared/time/domain/Duration.js";
import { TokenIntegrityError } from "../errors/TokenIntegrityError.js";
import type { IJwtEngine } from "../ports/IJwtEngine.js";

/**
 * Deterministic, instant JWT engine stub for tests.
 */
@MakeInjectable
export class StubJwtEngine implements IJwtEngine {
	public static deps = {};
	private nextToken = "mock-jwt-token";
	private nextPayload: unknown = { userId: "mock-user-id" };
	private errorToThrow: Error | null = null;

	constructor(public deps: DepsType<typeof StubJwtEngine.deps>) {}

	setNextToken(token: string): void {
		this.nextToken = token;
	}

	setNextPayload(payload: unknown): void {
		this.nextPayload = payload;
	}

	setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	async sign(_payload: unknown, _ttl: Duration): Promise<string> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		return this.nextToken;
	}

	async verify<T = unknown>(token: string, _options?: unknown): Promise<T> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (!token || typeof token !== "string") {
			throw new TokenIntegrityError("Token is required and must be a string");
		}
		return this.nextPayload as T;
	}
}
