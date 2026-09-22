import { describe, expect, it } from "vitest";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { StubIdGenerator } from "./infrastructure/StubIdGenerator.js";
import { Uuid } from "./Uuid.js";

describe("Uuid", () => {
	it("generates deterministic IDs with StubIdGenerator", () => {
		const stub = new StubIdGenerator({});
		const uuid = new Uuid({ idGenerator: stub });

		expect(uuid.generate()).toBe("stub-id-1");
		expect(uuid.generate()).toBe("stub-id-2");

		stub.setNextId("custom-fixed-id");
		expect(uuid.generate()).toBe("custom-fixed-id");
		expect(uuid.generate()).toBe("stub-id-3");
	});

	it("generates valid UUIDv4 strings with CryptoIdGenerator", () => {
		const gen = new CryptoIdGenerator({});
		const uuid = new Uuid({ idGenerator: gen });

		const id = uuid.generate();
		expect(typeof id).toBe("string");
		const uuidv4Regex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		expect(uuidv4Regex.test(id)).toBe(true);
	});
});
