import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";
import type { Resource } from "../domain/Resource.js";

export type UpdateResourceInput = {
  resource: Resource;
};

export type UpdateResourceOutput = {
  resource: Resource;
};

@MakeInjectable
export class UpdateResource {
  public static deps = {
    resourceRepository: IResourceRepository,
  };

  constructor(public deps: DepsType<typeof UpdateResource.deps>) {}

  async execute(props: UpdateResourceInput): Promise<UpdateResourceOutput> {
    return await this.deps.resourceRepository.UpdateResource({
      resource: props.resource,
    });
  }
}
