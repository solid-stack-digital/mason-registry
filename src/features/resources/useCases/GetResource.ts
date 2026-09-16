import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";
import type { Resource } from "../domain/Resource.js";

export type GetResourceInput = {
  resourceId: string;
};

export type GetResourceOutput = {
  resource: Resource;
};

@MakeInjectable
export class GetResource {
  public static deps = {
    resourceRepository: IResourceRepository,
  };

  constructor(public deps: DepsType<typeof GetResource.deps>) {}

  async execute(props: GetResourceInput): Promise<GetResourceOutput> {
    return await this.deps.resourceRepository.GetResourceById({
      resourceId: props.resourceId,
    });
  }
}
