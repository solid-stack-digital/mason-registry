import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { StubCredentialRepo } from "../infrastructure/StubCredentialRepo.js";
import { GetCredentialById } from "./GetCredentialById.js";

describe("GetCredentialById UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		getCredentialById = container.resolve(GetCredentialById);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let credRepo: StubCredentialRepo;
	let clock: Clock;
	let getCredentialById: GetCredentialById;

	it("returns null if credential does not exist", async () => {
		const result = await getCredentialById.execute({ id: "non-existent" });
		expect(result).toBeNull();
	});

	it("returns credential if it exists", async () => {
		await credRepo.save({
			id: "c-100",
			email: "user@example.com",
			passwordHash: "hash-val",
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		const result = await getCredentialById.execute({ id: "c-100" });
		expect(result).not.toBeNull();
		expect(result?.id).toBe("c-100");
		expect(result?.email).toBe("user@example.com");
		expect(result?.isVerified).toBe(true);
	});
});
