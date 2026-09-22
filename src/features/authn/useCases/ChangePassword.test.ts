import { beforeEach, describe, expect, it } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { StubHashEngine } from "@/shared/hasher/infrastructure/StubHashEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import {
	PasswordMismatchError,
	WeakPasswordError,
} from "../domain/errors/AuthnErrors.js";
import { PasswordChangedEvent } from "../domain/events/index.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { MemoryEventPublisher } from "../infrastructure/MemoryEventPublisher.js";
import { MemoryRefreshTokenRepo } from "../infrastructure/MemoryRefreshTokenRepo.js";
import { ChangePassword } from "./ChangePassword.js";

describe("ChangePassword UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let refreshTokenRepo: MemoryRefreshTokenRepo;
	let eventPublisher: MemoryEventPublisher;
	let hasher: Hasher;
	let clock: Clock;
	let changePassword: ChangePassword;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		refreshTokenRepo = new MemoryRefreshTokenRepo({ clock });
		eventPublisher = new MemoryEventPublisher({});
		hasher = new Hasher({ hashEngine: new StubHashEngine({}) });

		changePassword = new ChangePassword({
			credRepo,
			refreshTokenRepo,
			hasher,
			clock,
			eventPublisher,
		});
	});

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
			await hasher.compare(cred?.passwordHash || "", "newPassword456"),
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
