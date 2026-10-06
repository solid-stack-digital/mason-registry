import type { Container, DIModule } from "@solid-stack/di";
import { EmailAccessConfigToken } from "./configs/EmailAccessConfigToken.js";
import { IEmailAccessRepository } from "./domain/IEmailAccessRepository.js";
import { IOtpGateway } from "./domain/IOtpGateway.js";
import { EmailAccessVerificationError } from "./errors/EmailAccessVerificationError.js";
import { MemoryEmailAccessRepository } from "./infrastructure/MemoryEmailAccessRepository.js";
import { OtpGateway } from "./infrastructure/OtpGateway.js";

export const EmailAccessVerificationProvider: DIModule = (c: Container) => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new EmailAccessVerificationError(
			"Invalid INFRA_MODE: expected isolated or integrated",
		);
	}
	if (infraMode === "integrated") {
		// TODO: Implement and configure external adapters for email access persistence after import.
		throw new EmailAccessVerificationError(
			"Integrated emailAccessVerification infrastructure is not implemented: configure external adapters for email access persistence.",
		);
	} else {
		c.provide(IEmailAccessRepository, MemoryEmailAccessRepository);
	}
	// TODO: After import, resolve your application's Environment token and map its validated settings to the local EmailAccessConfigToken (durations are milliseconds).
	c.provideValue(EmailAccessConfigToken, {
		jwtTtl: 15 * 60 * 1000,
	});
	c.provide(IOtpGateway, OtpGateway);
};

export default EmailAccessVerificationProvider;
