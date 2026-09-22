import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { IMailer } from "@/features/mailing/domain/IMailer.js";
import { MemoryMailer } from "@/features/mailing/infrastructure/MemoryMailer.js";
import { OtpProvider } from "@/features/otp/diProvider.js";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { CryptoIdGenerator } from "@/shared/uuid/infrastructure/CryptoIdGenerator.js";
import { IIdGenerator } from "@/shared/uuid/ports/IIdGenerator.js";
import { EmailAccessVerificationProvider } from "./diProvider.js";
import {
	EmailAccessEmailMismatchError,
	EmailAccessPurposeMismatchError,
	EmailAccessTokenAlreadyUsedError,
	EmailAccessTokenExpiredError,
} from "./domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "./domain/IEmailAccessRepository.js";
import { IOtpGateway } from "./domain/IOtpGateway.js";
import { MemoryEmailAccessRepository } from "./infrastructure/MemoryEmailAccessRepository.js";
import { OtpGateway } from "./infrastructure/OtpGateway.js";
import { EmailAccessConfigToken } from "./tokens.js";
import { ConsumeEmailAccessToken } from "./useCases/ConsumeEmailAccessToken.js";
import { DecodeEmailAccessToken } from "./useCases/DecodeEmailAccessToken.js";
import { RequestEmailAccessVerification } from "./useCases/RequestEmailAccessVerification.js";
import { ValidateEmailAccess } from "./useCases/ValidateEmailAccess.js";

describe("Email Access Verification Feature Integration", () => {
	let container: Container;
	let stubTime: StubTimeEngine;
	let memoryMailer: MemoryMailer;

	let requestEmailAccessUc: RequestEmailAccessVerification;
	let validateEmailAccessUc: ValidateEmailAccess;
	let decodeTokenUc: DecodeEmailAccessToken;
	let consumeTokenUc: ConsumeEmailAccessToken;

	const BASE_TIME = 1_700_000_000_000;

	const createTestContainer = (): Container => {
		const c = new Container();

		// Configure time engine (controllable clock for deterministic tests)
		c.provide(ITimeEngine, StubTimeEngine);
		stubTime = c.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(BASE_TIME);

		// Configure UUID
		c.provide(IIdGenerator, CryptoIdGenerator);

		// Configure JWT
		c.provide(IJwtEngine, HmacJwtEngine);

		// Configure Mailing (real MemoryMailer adapter)
		c.provide(IMailer, MemoryMailer);

		// Configure OTP feature (real feature provider)
		OtpProvider(c);

		// Wire EmailAccessVerification feature (real provider, NO STUBS)
		EmailAccessVerificationProvider(c);

		// Provide explicit config for tests
		c.provideValue(EmailAccessConfigToken, {
			jwtTtl: Duration.fromMinutes(15),
		});

		return c;
	};

	beforeEach(() => {
		container = createTestContainer();

		requestEmailAccessUc = container.resolve(RequestEmailAccessVerification);
		validateEmailAccessUc = container.resolve(ValidateEmailAccess);
		decodeTokenUc = container.resolve(DecodeEmailAccessToken);
		consumeTokenUc = container.resolve(ConsumeEmailAccessToken);
		memoryMailer = container.resolve(IMailer) as MemoryMailer;
	});

	describe("1. DI Container Wiring Verification", () => {
		it("should naturally wire IEmailAccessRepository to MemoryEmailAccessRepository by default", () => {
			const repo = container.resolve(IEmailAccessRepository);
			expect(repo).toBeInstanceOf(MemoryEmailAccessRepository);
		});

		it("should naturally wire IOtpGateway to OtpGateway by default", () => {
			const gateway = container.resolve(IOtpGateway);
			expect(gateway).toBeInstanceOf(OtpGateway);
		});
	});

	describe("2. End-to-End Expected Behaviors", () => {
		it("Complete Flow: Request verification -> receive OTP in mail -> validate access -> decode token -> consume token", async () => {
			const email = "alice@example.com";
			const purpose = "PASSWORD_RESET";

			// 1. Request verification
			const reqResult = await requestEmailAccessUc.execute({ email, purpose });
			expect(reqResult.success).toBe(true);

			// Check that mail was received
			const sentMails = memoryMailer.getSentMails();
			expect(sentMails).toHaveLength(1);
			expect(sentMails[0]?.to).toBe(email);

			const match = sentMails[0]?.body.match(/\b\d{6}\b/);
			expect(match).not.toBeNull();
			const otpCode = match ? match[0] : "";

			// 2. Validate email access
			const validateResult = await validateEmailAccessUc.execute({
				email,
				purpose,
				code: otpCode,
			});
			expect(validateResult.emailAccessJwt).toBeDefined();
			const jwtToken = validateResult.emailAccessJwt;

			// 3. Decode email access token
			const decoded = await decodeTokenUc.execute({
				token: jwtToken,
				purpose,
			});
			expect(decoded.email).toBe(email);
			expect(decoded.purpose).toBe(purpose);
			expect(decoded.jti).toBeDefined();

			// 4. Consume email access token
			const consumeResult = await consumeTokenUc.execute({
				token: jwtToken,
				purpose,
				email,
			});
			expect(consumeResult).toBe(true);

			// 5. Attempt to reuse consumed token -> throws AlreadyUsedError
			await expect(
				decodeTokenUc.execute({
					token: jwtToken,
					purpose,
				}),
			).rejects.toThrow(EmailAccessTokenAlreadyUsedError);
		});

		it("Invalidates prior tokens when requesting a new verification for same email & purpose", async () => {
			const email = "bob@example.com";
			const purpose = "ACCOUNT_VERIFY";

			// 1. Request & validate first token
			await requestEmailAccessUc.execute({ email, purpose });
			const mail1 = memoryMailer.getSentMails()[0];
			const code1 = mail1?.body.match(/\b\d{6}\b/)?.[0] ?? "";

			const val1 = await validateEmailAccessUc.execute({
				email,
				purpose,
				code: code1,
			});
			const token1 = val1.emailAccessJwt;

			// Verify token 1 works before invalidation
			const decoded1 = await decodeTokenUc.execute({
				token: token1,
				purpose,
			});
			expect(decoded1.email).toBe(email);

			// Advance past cooldown (e.g. 35s)
			stubTime.advance(35_000);

			// 2. Request verification again -> must invalidate prior active tokens
			await requestEmailAccessUc.execute({ email, purpose });

			// Token 1 should now be rejected as invalidated
			await expect(
				decodeTokenUc.execute({
					token: token1,
					purpose,
				}),
			).rejects.toThrow(
				/Email access token has been invalidated|Email access token not found/,
			);
		});

		it("Rejects consumption when email does not match decoded email", async () => {
			const email = "charlie@example.com";
			const purpose = "LOGIN";

			await requestEmailAccessUc.execute({ email, purpose });
			const mail = memoryMailer.getSentMails()[0];
			const code = mail?.body.match(/\b\d{6}\b/)?.[0] ?? "";

			const val = await validateEmailAccessUc.execute({
				email,
				purpose,
				code,
			});

			await expect(
				consumeTokenUc.execute({
					token: val.emailAccessJwt,
					purpose,
					email: "david@example.com",
				}),
			).rejects.toThrow(EmailAccessEmailMismatchError);
		});

		it("Rejects token decoding when purpose does not match", async () => {
			const email = "eve@example.com";
			const purpose = "LOGIN";

			await requestEmailAccessUc.execute({ email, purpose });
			const mail = memoryMailer.getSentMails()[0];
			const code = mail?.body.match(/\b\d{6}\b/)?.[0] ?? "";

			const val = await validateEmailAccessUc.execute({
				email,
				purpose,
				code,
			});

			await expect(
				decodeTokenUc.execute({
					token: val.emailAccessJwt,
					purpose: "DIFFERENT_PURPOSE",
				}),
			).rejects.toThrow(EmailAccessPurposeMismatchError);
		});

		it("Rejects expired email access token", async () => {
			const email = "frank@example.com";
			const purpose = "LOGIN";

			await requestEmailAccessUc.execute({ email, purpose });
			const mail = memoryMailer.getSentMails()[0];
			const code = mail?.body.match(/\b\d{6}\b/)?.[0] ?? "";

			const val = await validateEmailAccessUc.execute({
				email,
				purpose,
				code,
			});

			// Advance time past 15 min TTL (16 minutes)
			stubTime.advance(16 * 60 * 1000);

			await expect(
				decodeTokenUc.execute({
					token: val.emailAccessJwt,
					purpose,
				}),
			).rejects.toThrow(EmailAccessTokenExpiredError);
		});
	});
});
