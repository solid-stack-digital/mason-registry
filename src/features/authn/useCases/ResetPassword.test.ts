import { beforeEach, describe, expect, it } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { StubHashEngine } from "@/shared/hasher/infrastructure/StubHashEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { AccountNotFoundError } from "../domain/errors/AuthnErrors.js";
import { PasswordChangedEvent } from "../domain/events/index.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { MemoryEventPublisher } from "../infrastructure/MemoryEventPublisher.js";
import { MemoryRefreshTokenRepo } from "../infrastructure/MemoryRefreshTokenRepo.js";
import { StubEAVGateway } from "../infrastructure/StubEAVGateway.js";
import { ResetPassword } from "./ResetPassword.js";

describe("ResetPassword UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let refreshTokenRepo: MemoryRefreshTokenRepo;
	let eventPublisher: MemoryEventPublisher;
	let eavGateway: StubEAVGateway;
	let hasher: Hasher;
	let clock: Clock;
	let resetPassword: ResetPassword;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		refreshTokenRepo = new MemoryRefreshTokenRepo({ clock });
		eventPublisher = new MemoryEventPublisher({});
		eavGateway = new StubEAVGateway({});
		hasher = new Hasher({ hashEngine: new StubHashEngine({}) });

		resetPassword = new ResetPassword({
			credRepo,
			refreshTokenRepo,
			hasher,
			eavGateway,
			clock,
			eventPublisher,
		});
	});

	it("successfully resets password, consumes token, deletes all sessions across devices, and emits event", async () => {
		const oldHash = await hasher.hash("oldPassword123");
		await credRepo.save({
			id: "cred-1",
			email: "user@example.com",
			passwordHash: oldHash,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		// Create sessions on multiple devices
		await refreshTokenRepo.save({
			id: "s-1",
			credentialId: "cred-1",
			clientDeviceId: "device-1",
			token: "tok-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});
		await refreshTokenRepo.save({
			id: "s-2",
			credentialId: "cred-1",
			clientDeviceId: "device-2",
			token: "tok-2",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		const result = await resetPassword.execute({
			email: "user@example.com",
			emailAccessToken: "valid-jwt-token",
			newPassword: "freshPassword123",
		});

		expect(result).toBe(true);

		// Gateway consumed token
		expect(eavGateway.consumedCalls).toHaveLength(1);
		expect(eavGateway.consumedCalls[0]).toEqual({
			token: "valid-jwt-token",
			purpose: "password_reset",
			email: "user@example.com",
		});

		// Password updated
		const cred = await credRepo.findById("cred-1");
		expect(
			await hasher.compare(cred?.passwordHash || "", "freshPassword123"),
		).toBe(true);

		// All sessions on all devices deleted
		expect(await refreshTokenRepo.findByToken("tok-1")).toBeNull();
		expect(await refreshTokenRepo.findByToken("tok-2")).toBeNull();

		// Event emitted
		const events = eventPublisher.getEvents();
		expect(events).toHaveLength(1);
		expect(events[0]).toBeInstanceOf(PasswordChangedEvent);
		expect((events[0] as PasswordChangedEvent).credId).toBe("cred-1");
	});

	it("throws if account is not found", async () => {
		await expect(
			resetPassword.execute({
				email: "nobody@example.com",
				emailAccessToken: "tok",
				newPassword: "password123",
			}),
		).rejects.toThrow(AccountNotFoundError);
	});

	it("throws if eavGateway fails to consume token", async () => {
		await credRepo.save({
			id: "cred-2",
			email: "user2@example.com",
			passwordHash: "hash",
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		eavGateway.setErrorToThrow(new Error("Token expired or invalid"));

		await expect(
			resetPassword.execute({
				email: "user2@example.com",
				emailAccessToken: "bad-token",
				newPassword: "newPassword123",
			}),
		).rejects.toThrow("Token expired or invalid");
	});
});
