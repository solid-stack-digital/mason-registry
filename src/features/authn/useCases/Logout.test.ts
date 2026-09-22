import { beforeEach, describe, expect, it } from "vitest";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import {
	DeviceMismatchError,
	RefreshTokenNotFoundError,
} from "../domain/errors/AuthnErrors.js";
import { MemoryRefreshTokenRepo } from "../infrastructure/MemoryRefreshTokenRepo.js";
import { Logout } from "./Logout.js";

describe("Logout UseCase", () => {
	let refreshTokenRepo: MemoryRefreshTokenRepo;
	let clock: Clock;
	let logout: Logout;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		refreshTokenRepo = new MemoryRefreshTokenRepo({ clock });
		logout = new Logout({ refreshTokenRepo });
	});

	it("successfully logs out session with deviceId + jti combination and keeps other device session alive", async () => {
		await refreshTokenRepo.save({
			id: "s-1",
			jti: "jti-1",
			credentialId: "c-1",
			clientDeviceId: "device-1",
			token: "refresh-tok-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await refreshTokenRepo.save({
			id: "s-2",
			jti: "jti-2",
			credentialId: "c-1",
			clientDeviceId: "device-2",
			token: "refresh-tok-2",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		const result = await logout.execute({
			refreshToken: "refresh-tok-1",
			clientDeviceId: "device-1",
		});

		expect(result).toBe(true);

		// Current session deleted
		expect(await refreshTokenRepo.findByToken("refresh-tok-1")).toBeNull();

		// Session on other device remains alive
		expect(await refreshTokenRepo.findByToken("refresh-tok-2")).not.toBeNull();
	});

	it("throws if refresh session not found", async () => {
		await expect(
			logout.execute({
				refreshToken: "ghost-token",
				clientDeviceId: "device-1",
			}),
		).rejects.toThrow(RefreshTokenNotFoundError);
	});

	it("throws if client device id does not match", async () => {
		await refreshTokenRepo.save({
			id: "s-1",
			jti: "jti-1",
			credentialId: "c-1",
			clientDeviceId: "device-real",
			token: "tok-123",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			logout.execute({
				refreshToken: "tok-123",
				clientDeviceId: "device-impostor",
			}),
		).rejects.toThrow(DeviceMismatchError);
	});
});
