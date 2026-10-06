import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUuidTestContainer } from "./__tests__/utils/getUuidTestContainer.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { StubIdGenerator } from "./infrastructure/StubIdGenerator.js";
import { IIdGenerator } from "./ports/IIdGenerator.js";
import { Uuid } from "./Uuid.js";

describe("Uuid", () => {
	let container: Container;
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		container = getUuidTestContainer();
		// Explicit test doubles; runtime providers keep actual or in-memory implementations.
		container.provide(IIdGenerator, StubIdGenerator);
	});
	afterEach(() => vi.unstubAllEnvs());
	it("generates deterministic IDs with StubIdGenerator", () => {
		const stub = container.resolve(StubIdGenerator);
		const uuid = container.resolve(Uuid);

		expect(uuid.generate()).toBe("stub-id-1");
		expect(uuid.generate()).toBe("stub-id-2");

		stub.setNextId("custom-fixed-id");
		expect(uuid.generate()).toBe("custom-fixed-id");
		expect(uuid.generate()).toBe("stub-id-3");
	});

	it("generates valid UUIDv4 strings with CryptoIdGenerator", () => {
		container.provide(IIdGenerator, CryptoIdGenerator);
		const uuid = container.resolve(Uuid);

		const id = uuid.generate();
		expect(typeof id).toBe("string");
		const uuidv4Regex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		expect(uuidv4Regex.test(id)).toBe(true);
	});

	it.each(["isolated", "integrated"])(
		"generates actual UUIDs by default in %s mode",
		(mode) => {
			vi.stubEnv("INFRA_MODE", mode);
			const uuid = getUuidTestContainer().resolve(Uuid);
			const first = uuid.generate();
			const second = uuid.generate();
			expect(first).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			expect(second).not.toBe(first);
		},
	);
});
