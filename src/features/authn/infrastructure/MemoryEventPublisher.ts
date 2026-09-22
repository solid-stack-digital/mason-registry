import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	AccountRegisteredEvent,
	PasswordChangedEvent,
} from "../domain/events/index.js";
import type { IAuthnEventPublisher } from "../domain/IAuthnEventPublisher.js";

@MakeInjectable
export class MemoryEventPublisher implements IAuthnEventPublisher {
	public static deps = {};
	private events: (AccountRegisteredEvent | PasswordChangedEvent | unknown)[] =
		[];

	constructor(public deps: DepsType<typeof MemoryEventPublisher.deps>) {}

	async publish(
		event: AccountRegisteredEvent | PasswordChangedEvent | unknown,
	): Promise<void> {
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
	}
}
