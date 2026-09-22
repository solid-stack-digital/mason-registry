import { beforeEach, describe, expect, it } from "vitest";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { GetCredentialById } from "./GetCredentialById.js";

describe("GetCredentialById UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let clock: Clock;
	let getCredentialById: GetCredentialById;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		getCredentialById = new GetCredentialById({ credRepo });
	});

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
