import type { Container, DIModule } from "@solid-stack/di";
import { DEFAULT_AUTHN_CONFIG } from "./domain/AuthnConfig.js";
import { IAuthnEventPublisher } from "./domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "./domain/ICredentialRepo.js";
import { IEAVGateway } from "./domain/IEAVGateway.js";
import { IRefreshTokenRepo } from "./domain/IRefreshTokenRepo.js";
import { ISessionRepo } from "./domain/ISessionRepo.js";
import { AuthnError } from "./errors/AuthnError.js";
import { EAVGateway } from "./infrastructure/EAVGateway.js";
import { MemoryCredentialRepo } from "./infrastructure/MemoryCredentialRepo.js";
import { MemoryEventPublisher } from "./infrastructure/MemoryEventPublisher.js";
import { MemoryRefreshTokenRepo } from "./infrastructure/MemoryRefreshTokenRepo.js";
import { AuthnConfigToken } from "./tokens.js";

export const AuthnProvider: DIModule = (c: Container) => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new AuthnError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	if (infraMode === "integrated") {
		// TODO: Implement and configure external adapters for credential and session persistence, and event delivery after import.
		throw new AuthnError(
			"Integrated authn infrastructure is not implemented: configure external adapters for credential and session persistence, and event delivery.",
		);
	} else {
		c.provide(ICredentialRepo, MemoryCredentialRepo);
		c.provide(IRefreshTokenRepo, MemoryRefreshTokenRepo);
		c.provide(ISessionRepo, MemoryRefreshTokenRepo);
		c.provide(IAuthnEventPublisher, MemoryEventPublisher);
	}
	c.provideValue(AuthnConfigToken, DEFAULT_AUTHN_CONFIG);
	c.provide(IEAVGateway, EAVGateway);
};

export default AuthnProvider;
