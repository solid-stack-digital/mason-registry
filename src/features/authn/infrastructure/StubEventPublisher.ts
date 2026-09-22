import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	AccountRegisteredEvent,
	PasswordChangedEvent,
} from "../domain/events/index.js";
import type { IAuthnEventPublisher } from "../domain/IAuthnEventPublisher.js";

@MakeInjectable
export class StubEventPublisher implements IAuthnEventPublisher {
	public static deps = {};
	private events: (AccountRegisteredEvent | PasswordChangedEvent | unknown)[] =
		[];
	private errorToThrow: Error | null = null;

	constructor(public deps: DepsType<typeof StubEventPublisher.deps>) {}

	public setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	async publish(
		event: AccountRegisteredEvent | PasswordChangedEvent | unknown,
	): Promise<void> {
		if (this.errorToThrow) throw this.errorToThrow;
		this.events.push(event);
	}

	async emit(
		event: AccountRegisteredEvent | PasswordChangedEvent | unknown,
	): Promise<void> {
		return this.publish(event);
	}

	getEvents(): (AccountRegisteredEvent | PasswordChangedEvent | unknown)[] {
		return [...this.events];
	}

	clear(): void {
		this.events = [];
		this.errorToThrow = null;
	}
}
