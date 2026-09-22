import { Container } from "@solid-stack/di";
import { describe, expect, it } from "vitest";
import { Time } from "@/shared/time/domain/Time.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "./StubEmailAccessRepository.js";

describe("StubEmailAccessRepository", () => {
	it("initializes with provided items and supports basic operations", async () => {
		const container = new Container();
		container.provideValue(InitialEmailAccesses, [
			{
				id: "1",
				jti: "jti-1",
				email: "a@b.com",
				purpose: "LOGIN",
				isUsed: false,
				isInvalidated: false,
				expiresAt: new Time(1000),
				createdAt: new Time(100),
				updatedAt: new Time(100),
			},
		]);
		const stub = container.resolve(StubEmailAccessRepository);

		expect(stub.getItems()).toHaveLength(1);
		const found = await stub.findByJti("jti-1");
		expect(found?.email).toBe("a@b.com");
	});
});
