import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";
import type { Resource } from "../domain/Resource.js";

export type CreateResourceInput = {
  resource: Resource;
};

export type CreateResourceOutput = {
  resource: Resource;
};

@MakeInjectable
export class CreateResource {
  public static deps = {
    resourceRepository: IResourceRepository,
  };

  constructor(public deps: DepsType<typeof CreateResource.deps>) {}

  async execute(props: CreateResourceInput): Promise<CreateResourceOutput> {
    return await this.deps.resourceRepository.CreateResource({
      resource: props.resource,
    });
  }
}
