import { randomUUID } from "node:crypto";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

/**
 * Production ID generator producing UUIDv4 identifiers using node:crypto
 */
@MakeInjectable
export class CryptoIdGenerator implements IIdGenerator {
	public static deps = {};

	constructor(public deps: DepsType<typeof CryptoIdGenerator.deps>) {}

	generate(): string {
		return randomUUID();
	}
}
