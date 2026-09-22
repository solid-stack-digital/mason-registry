import { describe, expect, it } from "vitest";
import {
	AccountRegisteredEvent,
	events,
	PasswordChangedEvent,
} from "./index.js";

describe("authn domain events", () => {
	it("creates AccountRegisteredEvent with credId and email", () => {
		const event = new AccountRegisteredEvent({
			credId: "c-123",
			email: "user@example.com",
		});
		expect(event.credId).toBe("c-123");
		expect(event.email).toBe("user@example.com");
	});

	it("creates PasswordChangedEvent supporting both credid and credId", () => {
		const event1 = new PasswordChangedEvent({ credId: "c-123" });
		expect(event1.credId).toBe("c-123");
		expect(event1.credid).toBe("c-123");

		const event2 = new PasswordChangedEvent({ credid: "c-456" });
		expect(event2.credId).toBe("c-456");
		expect(event2.credid).toBe("c-456");
	});

	it("events namespace exports classes properly", () => {
		expect(events.AccountRegisteredEvent).toBe(AccountRegisteredEvent);
		expect(events.PasswordChangedEvent).toBe(PasswordChangedEvent);
	});
});
