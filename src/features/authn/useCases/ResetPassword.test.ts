import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import { PasswordChangedEvent } from "../domain/events/index.js";
import { AccountNotFoundError } from "../errors/AuthnErrors.js";
import { StubCredentialRepo } from "../infrastructure/StubCredentialRepo.js";
import { StubEAVGateway } from "../infrastructure/StubEAVGateway.js";
import { StubEventPublisher } from "../infrastructure/StubEventPublisher.js";
import { StubRefreshTokenRepo } from "../infrastructure/StubRefreshTokenRepo.js";
import { ResetPassword } from "./ResetPassword.js";

describe("ResetPassword UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();
		hasher = container.resolve(Hasher);

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		refreshTokenRepo = container.resolve(StubRefreshTokenRepo);
		eventPublisher = container.resolve(StubEventPublisher);
		eavGateway = container.resolve(StubEAVGateway);

		resetPassword = container.resolve(ResetPassword);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;
	let hasher: Hasher;

	let credRepo: StubCredentialRepo;
	let refreshTokenRepo: StubRefreshTokenRepo;
	let eventPublisher: StubEventPublisher;
	let eavGateway: StubEAVGateway;

	let clock: Clock;
	let resetPassword: ResetPassword;

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
			await hasher.verify("freshPassword123", cred?.passwordHash || ""),
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
