import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { JwtEngine } from "@/shared/jwt/infrastructure/JwtEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import type { Credential } from "../domain/Credential.js";
import { StubCredentialRepo } from "../infrastructure/StubCredentialRepo.js";
import { StubRefreshTokenRepo } from "../infrastructure/StubRefreshTokenRepo.js";
import { Login } from "./Login.js";

describe("Login UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		refreshTokenRepo = container.resolve(StubRefreshTokenRepo);

		hasher = container.resolve(Hasher);
		stubJwt = container.resolve(JwtEngine);

		login = container.resolve(Login);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let credRepo: StubCredentialRepo;
	let refreshTokenRepo: StubRefreshTokenRepo;
	let clock: Clock;
	let stubTime: StubTimeEngine;
	let hasher: Hasher;

	let stubJwt: JwtEngine;

	let login: Login;

	it("successfully logs in verified user with valid credentials", async () => {
		const hashedPassword = await hasher.hash("secretPassword");
		const testCred: Credential = {
			id: "cred-1",
			email: "test@example.com",
			passwordHash: hashedPassword,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		};
		await credRepo.save(testCred);

		vi.spyOn(stubJwt, "sign").mockResolvedValue("signed-access-token");

		const result = await login.execute({
			email: "test@example.com",
			password: "secretPassword",
			clientDeviceId: "device-123",
		});

		expect(result.credentialId).toBe("cred-1");
		expect(result.accessToken).toBeDefined();
		expect(result.refreshToken).toBeDefined();

		const savedRefresh = await refreshTokenRepo.findById("stub-id-1");
		expect(savedRefresh).toBeDefined();
		expect(savedRefresh?.credentialId).toBe("cred-1");
		expect(savedRefresh?.clientDeviceId).toBe("device-123");
	});

	it("invalidates and deletes all previous refresh tokens for device and credential", async () => {
		const hashedPassword = await hasher.hash("secretPassword");
		const testCred: Credential = {
			id: "cred-1",
			email: "test@example.com",
			passwordHash: hashedPassword,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		};
		await credRepo.save(testCred);

		// Pre-populate old token for same device and credential
		await refreshTokenRepo.save({
			id: "old-refresh-1",
			jti: "old-refresh-1",
			credentialId: "cred-1",
			clientDeviceId: "device-123",
			token: "old-token-123",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("1d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		// Pre-populate token for DIFFERENT device
		await refreshTokenRepo.save({
			id: "other-device-token",
			jti: "other-device-token",
			credentialId: "cred-1",
			clientDeviceId: "other-device",
			token: "other-token-456",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("1d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await login.execute({
			email: "test@example.com",
			password: "secretPassword",
			clientDeviceId: "device-123",
		});

		// Old token on device-123 should be deleted
		const oldSession = await refreshTokenRepo.findById("old-refresh-1");
		expect(oldSession).toBeNull();

		// Session on other device should remain intact
		const otherSession = await refreshTokenRepo.findById("other-device-token");
		expect(otherSession).not.toBeNull();
	});

	it("throws error for non-existent user", async () => {
		await expect(
			login.execute({
				email: "unknown@example.com",
				password: "pwd",
				clientDeviceId: "device-123",
			}),
		).rejects.toThrow("Invalid email or password");
	});

	it("throws error for incorrect password", async () => {
		const hashedPassword = await hasher.hash("correctPassword");
		await credRepo.save({
			id: "cred-2",
			email: "user@example.com",
			passwordHash: hashedPassword,
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			login.execute({
				email: "user@example.com",
				password: "wrongPassword",
				clientDeviceId: "device-123",
			}),
		).rejects.toThrow("Invalid email or password");
	});

	it("throws error when user email is not verified", async () => {
		const hashedPassword = await hasher.hash("password");
		await credRepo.save({
			id: "cred-3",
			email: "unverified@example.com",
			passwordHash: hashedPassword,
			isVerified: false,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			login.execute({
				email: "unverified@example.com",
				password: "password",
				clientDeviceId: "device-123",
			}),
		).rejects.toThrow("Email has not been verified");
	});
});
