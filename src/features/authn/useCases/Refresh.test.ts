import { beforeEach, describe, expect, it } from "vitest";
import { StubJwtEngine } from "@/shared/jwt/infrastructure/StubJwtEngine.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { StubIdGenerator } from "@/shared/uuid/infrastructure/StubIdGenerator.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { DEFAULT_AUTHN_CONFIG } from "../domain/AuthnConfig.js";
import {
	DeviceMismatchError,
	RefreshTokenExpiredError,
	RefreshTokenNotFoundError,
} from "../domain/errors/AuthnErrors.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { MemoryRefreshTokenRepo } from "../infrastructure/MemoryRefreshTokenRepo.js";
import { Refresh } from "./Refresh.js";

describe("Refresh UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let refreshTokenRepo: MemoryRefreshTokenRepo;
	let clock: Clock;
	let jwt: Jwt;
	let stubJwt: StubJwtEngine;
	let uuid: Uuid;
	let refresh: Refresh;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		refreshTokenRepo = new MemoryRefreshTokenRepo({ clock });
		stubJwt = new StubJwtEngine({});
		jwt = new Jwt({ jwtEngine: stubJwt, clock });
		uuid = new Uuid({ idGenerator: new StubIdGenerator({}) });

		refresh = new Refresh({
			credRepo,
			refreshTokenRepo,
			jwt,
			uuid,
			clock,
			authnConfig: DEFAULT_AUTHN_CONFIG,
		});
	});

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

		stubJwt.setNextToken("new-access-jwt");

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
