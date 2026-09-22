import { beforeEach, describe, expect, it } from "vitest";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import {
	AccountAlreadyVerifiedError,
	AccountNotFoundError,
} from "../domain/errors/AuthnErrors.js";
import { MemoryCredentialRepo } from "../infrastructure/MemoryCredentialRepo.js";
import { StubEAVGateway } from "../infrastructure/StubEAVGateway.js";
import { VerifyEmail } from "./VerifyEmail.js";

describe("VerifyEmail UseCase", () => {
	let credRepo: MemoryCredentialRepo;
	let eavGateway: StubEAVGateway;
	let clock: Clock;
	let verifyEmail: VerifyEmail;

	beforeEach(() => {
		const stubTime = new StubTimeEngine({}, 1700000000000);
		clock = new Clock({ timeEngine: stubTime });
		credRepo = new MemoryCredentialRepo({});
		eavGateway = new StubEAVGateway({});

		verifyEmail = new VerifyEmail({
			credRepo,
			eavGateway,
			clock,
		});
	});

	it("successfully verifies unverified email using valid email access token and returns true", async () => {
		await credRepo.save({
			id: "c-1",
			email: "user@example.com",
			passwordHash: "hash",
			isVerified: false,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		const result = await verifyEmail.execute({
			email: "user@example.com",
			emailAccessToken: "valid-jwt-token",
		});

		expect(result).toBe(true);

		const updated = await credRepo.findById("c-1");
		expect(updated?.isVerified).toBe(true);
		expect(eavGateway.consumedCalls).toHaveLength(1);
		expect(eavGateway.consumedCalls[0]).toEqual({
			token: "valid-jwt-token",
			purpose: "email_verification",
			email: "user@example.com",
		});
	});

	it("throws if email is not found", async () => {
		await expect(
			verifyEmail.execute({
				email: "unknown@example.com",
				emailAccessToken: "token",
			}),
		).rejects.toThrow(AccountNotFoundError);
	});

	it("throws if email is already verified", async () => {
		await credRepo.save({
			id: "c-2",
			email: "verified@example.com",
			passwordHash: "hash",
			isVerified: true,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		await expect(
			verifyEmail.execute({
				email: "verified@example.com",
				emailAccessToken: "token",
			}),
		).rejects.toThrow(AccountAlreadyVerifiedError);
	});

	it("throws when gateway fails to consume token", async () => {
		await credRepo.save({
			id: "c-3",
			email: "test@example.com",
			passwordHash: "hash",
			isVerified: false,
			createdAt: clock.now(),
			updatedAt: clock.now(),
		});

		eavGateway.setErrorToThrow(new Error("Token already used"));

		await expect(
			verifyEmail.execute({
				email: "test@example.com",
				emailAccessToken: "bad-token",
			}),
		).rejects.toThrow("Token already used");
	});
});
