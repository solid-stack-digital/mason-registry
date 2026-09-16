import type { Container, DIModule } from "@solid-stack/di";
import { IResourceRepository } from "./domain/IResourceRepository.js";
import { StubResourceRepository } from "./infrastructure/StubResourceRepository.js";

export const ResourcesProvider: DIModule = (c: Container) => {
  c.provide(IResourceRepository, StubResourceRepository);
};

export default ResourcesProvider;
