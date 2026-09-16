import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";
import type { Resource } from "../domain/Resource.js";

export type ListResourcesInput = {
  page?: number | undefined;
  limit?: number | undefined;
};

export type ListResourcesOutput = {
  resources: Resource[];
  total?: number | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};

@MakeInjectable
export class ListResources {
  public static deps = {
    resourceRepository: IResourceRepository,
  };

  constructor(public deps: DepsType<typeof ListResources.deps>) {}

  async execute(props: ListResourcesInput): Promise<ListResourcesOutput> {
    return await this.deps.resourceRepository.ListResources(props);
  }
}
