import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAuthnEventPublisher } from "@/features/authn/domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "@/features/authn/domain/ICredentialRepo.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { AccountRegisteredEvent } from "../domain/events/index.js";
import {
	AccountAlreadyExistsError,
	InvalidEmailError,
	WeakPasswordError,
} from "../errors/AuthnErrors.js";
import {
	InitialCredentials,
	StubCredentialRepo,
} from "../infrastructure/StubCredentialRepo.js";
import { StubEventPublisher } from "../infrastructure/StubEventPublisher.js";
import { RegisterAccount } from "./RegisterAccount.js";

describe("RegisterAccount UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provide(ITimeEngine, StubTimeEngine);
		container.provideValue(InitialCredentials, []);
		container.provide(ICredentialRepo, StubCredentialRepo);
		container.provide(IAuthnEventPublisher, StubEventPublisher);

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		eventPublisher = container.resolve(StubEventPublisher);

		registerAccount = container.resolve(RegisterAccount);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let credRepo: StubCredentialRepo;
	let eventPublisher: StubEventPublisher;

	let clock: Clock;

	let registerAccount: RegisterAccount;

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
