import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getUuidTestContainer } from "../../__tests__/utils/getUuidTestContainer.js";
import { CryptoIdGenerator } from "../CryptoIdGenerator.js";
import { StubIdGenerator } from "../StubIdGenerator.js";

describe("IdGenerator Adapters", () => {
	let container: Container;
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		container = getUuidTestContainer();
	});
	afterEach(() => vi.unstubAllEnvs());
	it("CryptoIdGenerator generates non-empty UUID strings", () => {
		const generator = container.resolve(CryptoIdGenerator);
		const id1 = generator.generate();
		const id2 = generator.generate();

		expect(id1).toBeDefined();
		expect(id1.length).toBeGreaterThan(10);
		expect(id1).not.toBe(id2);
	});

	describe("StubIdGenerator", () => {
		it("returns sequential stub IDs", () => {
			const stub = container.resolve(StubIdGenerator);
			expect(stub.generate()).toBe("stub-id-1");
			expect(stub.generate()).toBe("stub-id-2");
		});

		it("allows setting next explicit ID", () => {
			const stub = container.resolve(StubIdGenerator);
			stub.setNextId("custom-test-uuid");
			expect(stub.generate()).toBe("custom-test-uuid");
			expect(stub.generate()).toBe("stub-id-1");
		});

		it("resets state", () => {
			const stub = container.resolve(StubIdGenerator);
			stub.generate();
			stub.generate();
			stub.reset();
			expect(stub.generate()).toBe("stub-id-1");
		});
	});
});
