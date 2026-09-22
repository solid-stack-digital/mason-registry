import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

/**
 * Deterministic ID generator stub for tests.
 */
@MakeInjectable
export class StubIdGenerator implements IIdGenerator {
	public static deps = {};
	private nextId: string | null = null;
	private sequence = 1;

	constructor(public deps: DepsType<typeof StubIdGenerator.deps>) {}

	setNextId(id: string): void {
		this.nextId = id;
	}

	reset(): void {
		this.nextId = null;
		this.sequence = 1;
	}

	generate(): string {
		if (this.nextId !== null) {
			const id = this.nextId;
			this.nextId = null;
			return id;
		}
		return `stub-id-${this.sequence++}`;
	}
}
