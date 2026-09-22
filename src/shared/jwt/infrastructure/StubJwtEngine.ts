import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import type { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { TokenIntegrityError } from "../errors/TokenIntegrityError.js";
import type { Jwt } from "../Jwt.js";
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

/**
 * In-memory test stub for Jwt service.
 */
@MakeInjectable
export class StubJwt implements Jwt {
	public static deps = {};
	public readonly stubJwtEngine: StubJwtEngine;
	public deps: { jwtEngine: IJwtEngine; clock: Clock };

	constructor(_deps: DepsType<typeof StubJwt.deps>) {
		this.stubJwtEngine = new StubJwtEngine({});
		this.deps = {
			jwtEngine: this.stubJwtEngine,
			clock: new Clock({ timeEngine: new StubTimeEngine({}) }),
		};
	}

	setNextToken(token: string): void {
		this.stubJwtEngine.setNextToken(token);
	}

	setNextPayload(payload: unknown): void {
		this.stubJwtEngine.setNextPayload(payload);
	}

	setError(error: Error | null): void {
		this.stubJwtEngine.setError(error);
	}

	async sign(payload: unknown, options: { ttl: Duration }): Promise<string> {
		return this.stubJwtEngine.sign(payload, options.ttl);
	}

	async verify<T = unknown>(token: string): Promise<T> {
		return this.stubJwtEngine.verify<T>(token);
	}
}
