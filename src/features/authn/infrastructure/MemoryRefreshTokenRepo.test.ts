import { beforeEach, describe, expect, it } from "vitest";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import type { RefreshToken } from "../domain/RefreshToken.js";
import { MemoryRefreshTokenRepo } from "./MemoryRefreshTokenRepo.js";

describe("MemoryRefreshTokenRepo", () => {
	let repo: MemoryRefreshTokenRepo;
	let clock: Clock;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		repo = new MemoryRefreshTokenRepo({ clock });
	});

	it("saves, finds, and deletes sessions by token, id, and jti", async () => {
		const session: RefreshToken = {
			id: "sess-1",
			jti: "jti-1",
			credentialId: "c-1",
			clientDeviceId: "d-1",
			token: "tok-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		};

		await repo.save(session);

		expect(await repo.findByToken("tok-1")).not.toBeNull();
		expect(await repo.findById("sess-1")).not.toBeNull();
		expect(await repo.findByJti("jti-1")).not.toBeNull();

		await repo.deleteByToken("tok-1");
		expect(await repo.findByToken("tok-1")).toBeNull();
	});

	it("deletes by device and jti combination", async () => {
		await repo.save({
			id: "sess-1",
			jti: "jti-1",
			credentialId: "c-1",
			clientDeviceId: "d-1",
			token: "tok-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});
		await repo.save({
			id: "sess-2",
			jti: "jti-2",
			credentialId: "c-1",
			clientDeviceId: "d-2",
			token: "tok-2",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await repo.deleteByDeviceAndJti("d-1", "jti-1");
		expect(await repo.findByToken("tok-1")).toBeNull();
		expect(await repo.findByToken("tok-2")).not.toBeNull();
	});

	it("deletes all sessions for credential except specified device", async () => {
		await repo.save({
			id: "s-1",
			jti: "j-1",
			credentialId: "c-1",
			clientDeviceId: "d-current",
			token: "tok-current",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});
		await repo.save({
			id: "s-2",
			jti: "j-2",
			credentialId: "c-1",
			clientDeviceId: "d-other-1",
			token: "tok-other-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await repo.deleteAllByCredentialExceptDevice("c-1", "d-current");
		expect(await repo.findByToken("tok-current")).not.toBeNull();
		expect(await repo.findByToken("tok-other-1")).toBeNull();
	});

	it("deletes all sessions by credential id", async () => {
		await repo.save({
			id: "s-1",
			credentialId: "c-1",
			clientDeviceId: "d-1",
			token: "tok-1",
			isRevoked: false,
			expiresAt: clock.now().plus(clock.duration("7d")),
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});
		await repo.deleteAllByCredentialId("c-1");
		expect(await repo.findByToken("tok-1")).toBeNull();
	});
});
