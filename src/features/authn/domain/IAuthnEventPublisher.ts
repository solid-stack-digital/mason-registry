import type {
	AccountRegisteredEvent,
	PasswordChangedEvent,
} from "./events/index.js";

export abstract class IAuthnEventPublisher {
	abstract emit(
		event: AccountRegisteredEvent | PasswordChangedEvent | unknown,
	): Promise<void> | void;
	abstract publish(
		event: AccountRegisteredEvent | PasswordChangedEvent | unknown,
	): Promise<void> | void;
}
