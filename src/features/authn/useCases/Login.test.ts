import { beforeEach, describe, expect, it } from "vitest";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { StubHashEngine } from "@/shared/hasher/infrastructure/StubHashEngine.js";
import { StubJwtEngine } from "@/shared/jwt/infrastructure/StubJwtEngine.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { StubIdGenerator } from "@/shared/uuid/infrastructure/StubIdGenerator.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import type { Credential } from "../domain/Credential.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { MemoryRefreshTokenRepo } from "../infrastructure/MemoryRefreshTokenRepo.js";
import { Login } from "./Login.js";

describe("Login UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let refreshTokenRepo: MemoryRefreshTokenRepo;
	let clock: Clock;
	let stubTime: StubTimeEngine;
	let hasher: Hasher;
	let stubHash: StubHashEngine;
	let jwt: Jwt;
	let stubJwt: StubJwtEngine;
	let uuid: Uuid;
	let stubId: StubIdGenerator;
	let login: Login;

	beforeEach(() => {
		stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		refreshTokenRepo = new MemoryRefreshTokenRepo({ clock });
		stubHash = new StubHashEngine({});
		hasher = new Hasher({ hashEngine: stubHash });
		stubJwt = new StubJwtEngine({});
		jwt = new Jwt({ jwtEngine: stubJwt, clock });
		stubId = new StubIdGenerator({});
		uuid = new Uuid({ idGenerator: stubId });

		login = new Login({
			credRepo,
			refreshTokenRepo,
			hasher,
			jwt,
			uuid,
			clock,
		});
	});

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

		stubJwt.setNextToken("signed-access-token");

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
	});

	it("throws error for non-existent user", async () => {
		await expect(
			login.execute({ email: "unknown@example.com", password: "pwd" }),
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
			login.execute({ email: "user@example.com", password: "wrongPassword" }),
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
			login.execute({ email: "unverified@example.com", password: "password" }),
		).rejects.toThrow("Email has not been verified");
	});
});
