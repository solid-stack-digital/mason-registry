import { describe, expect, it } from "vitest";
import { CryptoIdGenerator } from "../CryptoIdGenerator.js";
import { StubIdGenerator } from "../StubIdGenerator.js";

describe("IdGenerator Adapters", () => {
	it("CryptoIdGenerator generates non-empty UUID strings", () => {
		const generator = new CryptoIdGenerator({});
		const id1 = generator.generate();
		const id2 = generator.generate();

		expect(id1).toBeDefined();
		expect(id1.length).toBeGreaterThan(10);
		expect(id1).not.toBe(id2);
	});

	describe("StubIdGenerator", () => {
		it("returns sequential stub IDs", () => {
			const stub = new StubIdGenerator({});
			expect(stub.generate()).toBe("stub-id-1");
			expect(stub.generate()).toBe("stub-id-2");
		});

		it("allows setting next explicit ID", () => {
			const stub = new StubIdGenerator({});
			stub.setNextId("custom-test-uuid");
			expect(stub.generate()).toBe("custom-test-uuid");
			expect(stub.generate()).toBe("stub-id-1");
		});

		it("resets state", () => {
			const stub = new StubIdGenerator({});
			stub.generate();
			stub.generate();
			stub.reset();
			expect(stub.generate()).toBe("stub-id-1");
		});
	});
});
