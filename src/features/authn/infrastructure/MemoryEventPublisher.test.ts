import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { AccountRegisteredEvent } from "../domain/events/index.js";
import { MemoryEventPublisher } from "./MemoryEventPublisher.js";
import { StubEventPublisher } from "./StubEventPublisher.js";

describe("EventPublishers", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	it("MemoryEventPublisher stores and retrieves published events", async () => {
		const publisher = container.resolve(MemoryEventPublisher);
		const event = new AccountRegisteredEvent({
			credId: "c-1",
			email: "a@b.com",
		});
		await publisher.publish(event);

		expect(publisher.getEvents()).toHaveLength(1);
		expect(publisher.getEvents()[0]).toBe(event);

		publisher.clear();
		expect(publisher.getEvents()).toHaveLength(0);
	});

	it("StubEventPublisher can throw configured errors", async () => {
		const stub = container.resolve(StubEventPublisher);
		stub.setError(new Error("Event bus down"));

		await expect(
			stub.publish(
				new AccountRegisteredEvent({ credId: "c-1", email: "a@b.com" }),
			),
		).rejects.toThrow("Event bus down");
	});
});
