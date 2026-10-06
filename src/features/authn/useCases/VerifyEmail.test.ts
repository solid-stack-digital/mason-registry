import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ICredentialRepo } from "@/features/authn/domain/ICredentialRepo.js";
import { IEAVGateway } from "@/features/authn/domain/IEAVGateway.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { getAuthnTestContainer } from "../__tests__/utils/getAuthnTestContainer.js";
import {
	AccountAlreadyVerifiedError,
	AccountNotFoundError,
} from "../errors/AuthnErrors.js";
import {
	InitialCredentials,
	StubCredentialRepo,
} from "../infrastructure/StubCredentialRepo.js";
import { StubEAVGateway } from "../infrastructure/StubEAVGateway.js";
import { VerifyEmail } from "./VerifyEmail.js";

describe("VerifyEmail UseCase", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getAuthnTestContainer();

		// Explicit test doubles; runtime providers keep actual or in-memory implementations.

		container.provide(ITimeEngine, StubTimeEngine);
		container.provideValue(InitialCredentials, []);
		container.provide(ICredentialRepo, StubCredentialRepo);
		container.provide(IEAVGateway, StubEAVGateway);

		const stubTime = container.resolve(StubTimeEngine);
		stubTime.setTime(1700000000000);
		clock = container.resolve(Clock);
		credRepo = container.resolve(StubCredentialRepo);
		eavGateway = container.resolve(StubEAVGateway);
		verifyEmail = container.resolve(VerifyEmail);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let credRepo: StubCredentialRepo;
	let eavGateway: StubEAVGateway;
	let clock: Clock;
	let verifyEmail: VerifyEmail;

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
