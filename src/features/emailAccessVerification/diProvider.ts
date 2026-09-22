import type { Container, DIModule } from "@solid-stack/di";
import { DEFAULT_EMAIL_ACCESS_CONFIG } from "./domain/EmailAccessConfig.js";
import { IEmailAccessRepository } from "./domain/IEmailAccessRepository.js";
import { IOtpGateway } from "./domain/IOtpGateway.js";
import { MemoryEmailAccessRepository } from "./infrastructure/MemoryEmailAccessRepository.js";
import { OtpGateway } from "./infrastructure/OtpGateway.js";
import { EmailAccessConfigToken } from "./tokens.js";

export const EmailAccessVerificationProvider: DIModule = (c: Container) => {
	c.provideValue(EmailAccessConfigToken, DEFAULT_EMAIL_ACCESS_CONFIG);
	c.provide(IEmailAccessRepository, MemoryEmailAccessRepository);
	c.provide(IOtpGateway, OtpGateway);
};

export default EmailAccessVerificationProvider;
