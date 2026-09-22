import { AccountRegisteredEvent } from "./AccountRegisteredEvent.js";
import { PasswordChangedEvent } from "./PasswordChangedEvent.js";

export * from "./AccountRegisteredEvent.js";
export * from "./PasswordChangedEvent.js";

export const events = {
	AccountRegisteredEvent,
	PasswordChangedEvent,
};

export default events;
