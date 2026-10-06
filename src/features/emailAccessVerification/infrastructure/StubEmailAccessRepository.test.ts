import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IEmailAccessRepository } from "@/features/emailAccessVerification/domain/IEmailAccessRepository.js";
import { Time } from "@/shared/time/domain/Time.js";
import { getEmailAccessVerificationTestContainer } from "../__tests__/utils/getEmailAccessVerificationTestContainer.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "./StubEmailAccessRepository.js";

describe("StubEmailAccessRepository", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getEmailAccessVerificationTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provideValue(InitialEmailAccesses, []);
		container.provide(IEmailAccessRepository, StubEmailAccessRepository);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	it("initializes with provided items and supports basic operations", async () => {
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
