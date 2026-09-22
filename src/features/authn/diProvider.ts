import type { Container, DIModule } from "@solid-stack/di";
import { DEFAULT_AUTHN_CONFIG } from "./domain/AuthnConfig.js";
import { IAuthnEventPublisher } from "./domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "./domain/ICredentialRepo.js";
import { IEAVGateway } from "./domain/IEAVGateway.js";
import { IRefreshTokenRepo } from "./domain/IRefreshTokenRepo.js";
import { ISessionRepo } from "./domain/ISessionRepo.js";
import { EAVGateway } from "./infrastructure/EAVGateway.js";
import { MemoryCredentialRepo } from "./infrastructure/MemoryCredentialRepo.js";
import { MemoryEventPublisher } from "./infrastructure/MemoryEventPublisher.js";
import { MemoryRefreshTokenRepo } from "./infrastructure/MemoryRefreshTokenRepo.js";
import { AuthnConfigToken } from "./tokens.js";

export const AuthnProvider: DIModule = (c: Container) => {
	c.provideValue(AuthnConfigToken, DEFAULT_AUTHN_CONFIG);
	c.provide(ICredentialRepo, MemoryCredentialRepo);
	c.provide(IRefreshTokenRepo, MemoryRefreshTokenRepo);
	c.provide(ISessionRepo, MemoryRefreshTokenRepo);
	c.provide(IAuthnEventPublisher, MemoryEventPublisher);
	c.provide(IEAVGateway, EAVGateway);
};

export default AuthnProvider;
