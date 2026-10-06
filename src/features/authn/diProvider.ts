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
import {
	InitialCredentials,
	StubCredentialRepo,
} from "./infrastructure/StubCredentialRepo.js";
import { StubEAVGateway } from "./infrastructure/StubEAVGateway.js";
import { StubEventPublisher } from "./infrastructure/StubEventPublisher.js";
import {
	InitialRefreshTokens,
	StubRefreshTokenRepo,
} from "./infrastructure/StubRefreshTokenRepo.js";
import { AuthnConfigToken } from "./tokens.js";

export const AuthnProvider: DIModule = (c: Container) => {
	c.provideValue(AuthnConfigToken, DEFAULT_AUTHN_CONFIG);
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provideValue(InitialCredentials, []);
		c.provideValue(InitialRefreshTokens, []);
		c.provide(ICredentialRepo, StubCredentialRepo);
		c.provide(IRefreshTokenRepo, StubRefreshTokenRepo);
		c.provide(ISessionRepo, StubRefreshTokenRepo);
		c.provide(IAuthnEventPublisher, StubEventPublisher);
		c.provide(IEAVGateway, StubEAVGateway);
	} else if (infraMode === "integrated") {
		c.provide(ICredentialRepo, MemoryCredentialRepo);
		c.provide(IRefreshTokenRepo, MemoryRefreshTokenRepo);
		c.provide(ISessionRepo, MemoryRefreshTokenRepo);
		c.provide(IAuthnEventPublisher, MemoryEventPublisher);
		c.provide(IEAVGateway, EAVGateway);
	} else {
		throw new AuthnError(
			"Received an invalid INFRA_MODE env while loading authn provider",
		);
	}
};

export default AuthnProvider;
