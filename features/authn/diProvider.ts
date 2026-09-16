import type { Container, DIModule } from "@solid-stack/di";
import { ICredentialRepo } from "./domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "./domain/IRefreshTokenRepo.js";
import { MemoryCredentialRepo } from "./infrastructure/MemoryCredentialRepo.js";
import { MemoryRefreshTokenRepo } from "./infrastructure/MemoryRefreshTokenRepo.js";

export const AuthnProvider: DIModule = (c: Container) => {
  c.provide(ICredentialRepo, MemoryCredentialRepo);
  c.provide(IRefreshTokenRepo, MemoryRefreshTokenRepo);
};

export default AuthnProvider;
