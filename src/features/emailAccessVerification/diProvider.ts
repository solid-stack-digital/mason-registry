import type { Container, DIModule } from "@solid-stack/di";
import { DEFAULT_EMAIL_ACCESS_CONFIG } from "./domain/EmailAccessConfig.js";
import { IEmailAccessRepository } from "./domain/IEmailAccessRepository.js";
import { IOtpGateway } from "./domain/IOtpGateway.js";
import { EmailAccessVerificationError } from "./errors/EmailAccessVerificationError.js";
import { MemoryEmailAccessRepository } from "./infrastructure/MemoryEmailAccessRepository.js";
import { OtpGateway } from "./infrastructure/OtpGateway.js";
import {
	InitialEmailAccesses,
	StubEmailAccessRepository,
} from "./infrastructure/StubEmailAccessRepository.js";
import { StubOtpGateway } from "./infrastructure/StubOtpGateway.js";
import { EmailAccessConfigToken } from "./tokens.js";

export const EmailAccessVerificationProvider: DIModule = (c: Container) => {
	c.provideValue(EmailAccessConfigToken, DEFAULT_EMAIL_ACCESS_CONFIG);
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provideValue(InitialEmailAccesses, []);
		c.provide(IEmailAccessRepository, StubEmailAccessRepository);
		c.provide(IOtpGateway, StubOtpGateway);
	} else if (infraMode === "integrated") {
		c.provide(IEmailAccessRepository, MemoryEmailAccessRepository);
		c.provide(IOtpGateway, OtpGateway);
	} else {
		throw new EmailAccessVerificationError(
			"Received an invalid INFRA_MODE env while loading emailAccessVerification provider",
		);
	}
};

export default EmailAccessVerificationProvider;
