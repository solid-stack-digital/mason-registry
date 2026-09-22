import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { EmailAccessVerificationProvider } from "@/features/emailAccessVerification/diProvider.js";
import { RequestEmailAccessVerification } from "@/features/emailAccessVerification/useCases/RequestEmailAccessVerification.js";
import { ValidateEmailAccess } from "@/features/emailAccessVerification/useCases/ValidateEmailAccess.js";
import { OtpProvider } from "@/features/otp/diProvider.js";
import { IOtpEmailGateway } from "@/features/otp/domain/IOtpEmailGateway.js";
import { StubOtpEmailGateway } from "@/features/otp/infrastructure/StubOtpEmailGateway.js";
import { StubHashEngine } from "@/shared/hasher/infrastructure/StubHashEngine.js";
import { IHashEngine } from "@/shared/hasher/ports/IHashEngine.js";
import { HmacJwtEngine } from "@/shared/jwt/infrastructure/HmacJwtEngine.js";
import { IJwtEngine } from "@/shared/jwt/ports/IJwtEngine.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { StubIdGenerator } from "@/shared/uuid/infrastructure/StubIdGenerator.js";
import { IIdGenerator } from "@/shared/uuid/ports/IIdGenerator.js";
import { AuthnProvider } from "./diProvider.js";
import {
	AccountRegisteredEvent,
	PasswordChangedEvent,
} from "./domain/events/index.js";
import { IAuthnEventPublisher } from "./domain/IAuthnEventPublisher.js";
import type { MemoryEventPublisher } from "./infrastructure/MemoryEventPublisher.js";
import { ChangePassword } from "./useCases/ChangePassword.js";
import { GetCredentialById } from "./useCases/GetCredentialById.js";
import { Login } from "./useCases/Login.js";
import { Logout } from "./useCases/Logout.js";
import { Refresh } from "./useCases/Refresh.js";
import { RegisterAccount } from "./useCases/RegisterAccount.js";
import { ResetPassword } from "./useCases/ResetPassword.js";
import { VerifyEmail } from "./useCases/VerifyEmail.js";

describe("Authn Feature Integration", () => {
	let container: Container;
	let eventPublisher: MemoryEventPublisher;

	beforeEach(() => {
		container = new Container();

		// Shared infrastructure test doubles
		container.provide(ITimeEngine, StubTimeEngine);
		const stubTime = container.resolve(ITimeEngine) as StubTimeEngine;
		stubTime.setMillis(1700000000000);

		container.provide(IHashEngine, StubHashEngine);
		container.provide(IJwtEngine, HmacJwtEngine);
		container.provide(IIdGenerator, StubIdGenerator);

		// Feature providers
		OtpProvider(container);
		container.provide(IOtpEmailGateway, StubOtpEmailGateway);
		EmailAccessVerificationProvider(container);
		AuthnProvider(container);

		// Resolve publisher
		eventPublisher = container.resolve(
			IAuthnEventPublisher,
		) as MemoryEventPublisher;
	});

	it("executes the complete authentication, email verification, session refresh, password management lifecycle", async () => {
		const registerAccountUc = container.resolve(RegisterAccount);
		const loginUc = container.resolve(Login);
		const verifyEmailUc = container.resolve(VerifyEmail);
		const refreshUc = container.resolve(Refresh);
		const changePasswordUc = container.resolve(ChangePassword);
		const resetPasswordUc = container.resolve(ResetPassword);
		const logoutUc = container.resolve(Logout);
		const getCredByIdUc = container.resolve(GetCredentialById);

		const requestEavUc = container.resolve(RequestEmailAccessVerification);
		const validateEavUc = container.resolve(ValidateEmailAccess);

		// 1. Register Account
		const email = "user@example.com";
		const password = "mySecurePassword123";
		const credId = await registerAccountUc.execute({ email, password });
		expect(credId).toBeDefined();

		// Check emitted event
		const regEvents = eventPublisher.getEvents();
		expect(regEvents).toHaveLength(1);
		expect(regEvents[0]).toBeInstanceOf(AccountRegisteredEvent);

		// Check unverified credential
		const cred = await getCredByIdUc.execute({ id: credId });
		expect(cred).not.toBeNull();
		expect(cred?.isVerified).toBe(false);

		// 2. Login fails before verification
		await expect(
			loginUc.execute({
				email,
				password,
				clientDeviceId: "device-desktop",
			}),
		).rejects.toThrow("Email has not been verified");

		// 3. Email Access Verification flow
		const reqResult = await requestEavUc.execute({
			email,
			purpose: "email_verification",
		});
		expect(reqResult.success).toBe(true);
		expect(reqResult.otpCode).toBeDefined();

		const valResult = await validateEavUc.execute({
			email,
			purpose: "email_verification",
			code: reqResult.otpCode || "",
		});
		expect(valResult.emailAccessJwt).toBeDefined();

		// 4. Verify Email in Authn
		const verifyResult = await verifyEmailUc.execute({
			email,
			emailAccessToken: valResult.emailAccessJwt,
		});
		expect(verifyResult).toBe(true);

		const verifiedCred = await getCredByIdUc.execute({ id: credId });
		expect(verifiedCred?.isVerified).toBe(true);

		// 5. Login succeeds
		const loginResult = await loginUc.execute({
			email,
			password,
			clientDeviceId: "device-desktop",
		});
		expect(loginResult.accessToken).toBeDefined();
		expect(loginResult.refreshToken).toBeDefined();

		// 6. Refresh token
		const refreshResult = await refreshUc.execute({
			refreshToken: loginResult.refreshToken,
			clientDeviceId: "device-desktop",
		});
		expect(refreshResult.accessToken).toBeDefined();
		expect(refreshResult.refreshToken).toBeDefined();

		// 7. Change Password
		eventPublisher.clear();
		const newPassword = "newPasswordSuperSecure1";
		const changeResult = await changePasswordUc.execute({
			refreshtoken: refreshResult.refreshToken,
			clientDeviceId: "device-desktop",
			currentPassword: password,
			newPassword,
		});
		expect(changeResult).toBe(true);

		const pwEvents = eventPublisher.getEvents();
		expect(pwEvents).toHaveLength(1);
		expect(pwEvents[0]).toBeInstanceOf(PasswordChangedEvent);

		// 8. Logout
		const logoutResult = await logoutUc.execute({
			refreshToken: refreshResult.refreshToken,
			clientDeviceId: "device-desktop",
		});
		expect(logoutResult).toBe(true);

		// 9. Reset Password flow using EAV
		const reqResetEav = await requestEavUc.execute({
			email,
			purpose: "password_reset",
		});
		const valResetEav = await validateEavUc.execute({
			email,
			purpose: "password_reset",
			code: reqResetEav.otpCode || "",
		});

		eventPublisher.clear();
		const finalPassword = "finalResetPassword999";
		const resetResult = await resetPasswordUc.execute({
			email,
			emailAccessToken: valResetEav.emailAccessJwt,
			newPassword: finalPassword,
		});
		expect(resetResult).toBe(true);

		const resetEvents = eventPublisher.getEvents();
		expect(resetEvents).toHaveLength(1);
		expect(resetEvents[0]).toBeInstanceOf(PasswordChangedEvent);

		// 10. Login with new password succeeds
		const finalLogin = await loginUc.execute({
			email,
			password: finalPassword,
			clientDeviceId: "device-desktop",
		});
		expect(finalLogin.accessToken).toBeDefined();
	});
});
