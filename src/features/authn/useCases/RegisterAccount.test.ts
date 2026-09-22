import { beforeEach, describe, expect, it } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { StubHashEngine } from "@/shared/hasher/infrastructure/StubHashEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { StubIdGenerator } from "@/shared/uuid/infrastructure/StubIdGenerator.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import {
	AccountAlreadyExistsError,
	InvalidEmailError,
	WeakPasswordError,
} from "../domain/errors/AuthnErrors.js";
import { AccountRegisteredEvent } from "../domain/events/index.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { MemoryEventPublisher } from "../infrastructure/MemoryEventPublisher.js";
import { RegisterAccount } from "./RegisterAccount.js";

describe("RegisterAccount UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let eventPublisher: MemoryEventPublisher;
	let hasher: Hasher;
	let clock: Clock;
	let uuid: Uuid;
	let registerAccount: RegisterAccount;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		eventPublisher = new MemoryEventPublisher({});
		hasher = new Hasher({ hashEngine: new StubHashEngine({}) });
		uuid = new Uuid({ idGenerator: new StubIdGenerator({}) });

		registerAccount = new RegisterAccount({
			credRepo,
			hasher,
			uuid,
			clock,
			eventPublisher,
		});
	});

	it("successfully registers new account, hashes password, saves with isVerified false, emits event, and returns credential id", async () => {
		const credId = await registerAccount.execute({
			email: "User@Example.com",
			password: "securePassword123",
		});

		expect(credId).toBeDefined();

		const saved = await credRepo.findById(credId);
		expect(saved).not.toBeNull();
		expect(saved?.email).toBe("user@example.com");
		expect(saved?.isVerified).toBe(false);
		expect(saved?.passwordHash).not.toBe("securePassword123");

		const events = eventPublisher.getEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toBeInstanceOf(AccountRegisteredEvent);
		const regEvent = events[0] as AccountRegisteredEvent;
		expect(regEvent.credId).toBe(credId);
		expect(regEvent.email).toBe("user@example.com");
	});

	it("throws if email already exists on credRepo (even if unverified)", async () => {
		await credRepo.save({
			id: "existing-1",
			email: "existing@example.com",
			passwordHash: "hash",
			isVerified: false,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			registerAccount.execute({
				email: "existing@example.com",
				password: "newPassword123",
			}),
		).rejects.toThrow(AccountAlreadyExistsError);
	});

	it("throws if email is invalid", async () => {
		await expect(
			registerAccount.execute({
				email: "not-an-email",
				password: "validPassword123",
			}),
		).rejects.toThrow(InvalidEmailError);
	});

	it("throws if password is weak", async () => {
		await expect(
			registerAccount.execute({
				email: "test@example.com",
				password: "short",
			}),
		).rejects.toThrow(WeakPasswordError);
	});
});
