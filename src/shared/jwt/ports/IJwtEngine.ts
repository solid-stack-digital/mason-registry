import type { Duration } from "@/shared/time/domain/Duration.js";

/**
 * JWT Token Signer and Verifier Port.
 */
export abstract class IJwtEngine {
	abstract sign(payload: unknown, ttl: Duration): Promise<string>;
	abstract verify<T = unknown>(token: string): Promise<T>;
}
