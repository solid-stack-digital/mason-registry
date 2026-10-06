import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JwtEngine } from "@/shared/jwt/infrastructure/JwtEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import {
	DeviceMismatchError,
	RefreshTokenExpiredError,
	RefreshTokenNotFoundError,
} from "../errors/AuthnErrors.js";
import { StubCredentialRepo } from "../infrastructure/StubCredentialRepo.js";
import { StubRefreshTokenRepo } from "../infrastructure/StubRefreshTokenRepo.js";
import { Refresh } from "./Refresh.js";

describe("Refresh UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		refreshTokenRepo = container.resolve(StubRefreshTokenRepo);
		stubJwt = container.resolve(JwtEngine);

		refresh = container.resolve(Refresh);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let credRepo: StubCredentialRepo;
	let refreshTokenRepo: StubRefreshTokenRepo;
	let clock: Clock;

	let stubJwt: JwtEngine;

	let refresh: Refresh;

	it("successfully refreshes token, deletes old session, creates new session, and returns new tokens", async () => {
		await credRepo.save({
			id: "cred-1",
			email: "user@example.com",
			passwordHash: "hash",
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await refreshTokenRepo.save({
			id: "old-id",
			jti: "old-jti",
			credentialId: "cred-1",
			clientDeviceId: "device-1",
			token: "old-token-abc",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		vi.spyOn(stubJwt, "sign").mockResolvedValue("new-access-jwt");

		const result = await refresh.execute({
			refreshToken: "old-token-abc",
			clientDeviceId: "device-1",
		});

		expect(result.accessToken).toBeDefined();
		expect(result.refreshToken).toBeDefined();

		// Old session must be deleted
		const oldSession = await refreshTokenRepo.findByToken("old-token-abc");
		expect(oldSession).toBeNull();

		// New session must exist
		const newSession = await refreshTokenRepo.findByToken(result.refreshToken);
		expect(newSession).not.toBeNull();
		expect(newSession?.clientDeviceId).toBe("device-1");
	});

	it("throws if refresh token not found", async () => {
		await expect(
			refresh.execute({
				refreshToken: "non-existent",
				clientDeviceId: "device-1",
			}),
		).rejects.toThrow(RefreshTokenNotFoundError);
	});

	it("throws if refresh token is expired", async () => {
		await refreshTokenRepo.save({
			id: "exp-id",
			credentialId: "cred-1",
			clientDeviceId: "device-1",
			token: "exp-token",
			isRevoked: false,
			expiresAt: clock.now().minus(clock.duration("1s")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			refresh.execute({
				refreshToken: "exp-token",
				clientDeviceId: "device-1",
			}),
		).rejects.toThrow(RefreshTokenExpiredError);
	});

	it("throws if client device ID does not match the token device", async () => {
		await refreshTokenRepo.save({
			id: "id-1",
			credentialId: "cred-1",
			clientDeviceId: "device-A",
			token: "tok-A",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("1d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			refresh.execute({
				refreshToken: "tok-A",
				clientDeviceId: "device-B",
			}),
		).rejects.toThrow(DeviceMismatchError);
	});
});
