import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAuthnEventPublisher } from "@/features/authn/domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "@/features/authn/domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "@/features/authn/domain/IRefreshTokenRepo.js";
import { ISessionRepo } from "@/features/authn/domain/ISessionRepo.js";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { PasswordChangedEvent } from "../domain/events/index.js";
import {
	PasswordMismatchError,
	WeakPasswordError,
} from "../errors/AuthnErrors.js";
import {
	InitialCredentials,
	StubCredentialRepo,
} from "../infrastructure/StubCredentialRepo.js";
import { StubEventPublisher } from "../infrastructure/StubEventPublisher.js";
import {
	InitialRefreshTokens,
	StubRefreshTokenRepo,
} from "../infrastructure/StubRefreshTokenRepo.js";
import { ChangePassword } from "./ChangePassword.js";

describe("ChangePassword UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provide(ITimeEngine, StubTimeEngine);
		container.provideValue(InitialCredentials, []);
		container.provide(ICredentialRepo, StubCredentialRepo);
		container.provideValue(InitialRefreshTokens, []);
		container.provide(IRefreshTokenRepo, StubRefreshTokenRepo);
		container.provide(ISessionRepo, StubRefreshTokenRepo);
		container.provide(IAuthnEventPublisher, StubEventPublisher);
		hasher = container.resolve(Hasher);

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		refreshTokenRepo = container.resolve(StubRefreshTokenRepo);
		eventPublisher = container.resolve(StubEventPublisher);

		changePassword = container.resolve(ChangePassword);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	let hasher: Hasher;

	let credRepo: StubCredentialRepo;
	let refreshTokenRepo: StubRefreshTokenRepo;
	let eventPublisher: StubEventPublisher;

	let clock: Clock;
	let changePassword: ChangePassword;

	it("successfully changes password, keeps requesting device session, deletes others, and emits event", async () => {
		const currentPasswordHash = await hasher.hash("oldPassword123");
		await credRepo.save({
			id: "cred-1",
			email: "user@example.com",
			passwordHash: currentPasswordHash,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		// Session on requesting device
		await refreshTokenRepo.save({
			id: "sess-curr",
			credentialId: "cred-1",
			clientDeviceId: "device-curr",
			token: "refresh-curr",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		// Session on another device
		await refreshTokenRepo.save({
			id: "sess-other",
			credentialId: "cred-1",
			clientDeviceId: "device-other",
			token: "refresh-other",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		const result = await changePassword.execute({
			refreshtoken: "refresh-curr",
			clientDeviceId: "device-curr",
			currentPassword: "oldPassword123",
			newPassword: "newPassword456",
		});

		expect(result).toBe(true);

		// Password hash updated
		const cred = await credRepo.findById("cred-1");
		expect(
			await hasher.verify("newPassword456", cred?.passwordHash || ""),
		).toBe(true);

		// Current session is preserved
		expect(await refreshTokenRepo.findByToken("refresh-curr")).not.toBeNull();

		// Other session is deleted
		expect(await refreshTokenRepo.findByToken("refresh-other")).toBeNull();

		// Event emitted
		const events = eventPublisher.getEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toBeInstanceOf(PasswordChangedEvent);
		expect((events[0] as PasswordChangedEvent).credId).toBe("cred-1");
	});

	it("throws if current password does not match", async () => {
		const currentPasswordHash = await hasher.hash("correctOldPassword");
		await credRepo.save({
			id: "cred-2",
			email: "user2@example.com",
			passwordHash: currentPasswordHash,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await refreshTokenRepo.save({
			id: "sess-2",
			credentialId: "cred-2",
			clientDeviceId: "dev-2",
			token: "tok-2",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			changePassword.execute({
				refreshtoken: "tok-2",
				clientDeviceId: "dev-2",
				currentPassword: "wrongOldPassword",
				newPassword: "brandNewPassword123",
			}),
		).rejects.toThrow(PasswordMismatchError);
	});

	it("throws if new password is too short", async () => {
		const currentPasswordHash = await hasher.hash("oldPassword123");
		await credRepo.save({
			id: "cred-3",
			email: "user3@example.com",
			passwordHash: currentPasswordHash,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await refreshTokenRepo.save({
			id: "sess-3",
			credentialId: "cred-3",
			clientDeviceId: "dev-3",
			token: "tok-3",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			changePassword.execute({
				refreshtoken: "tok-3",
				clientDeviceId: "dev-3",
				currentPassword: "oldPassword123",
				newPassword: "short",
			}),
		).rejects.toThrow(WeakPasswordError);
	});
});
