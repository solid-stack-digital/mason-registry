import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";

export type DeleteResourceInput = {
  resourceId: string;
};

export type DeleteResourceOutput = {
  success: boolean;
};

@MakeInjectable
export class DeleteResource {
  public static deps = {
    resourceRepository: IResourceRepository,
  };

  constructor(public deps: DepsType<typeof DeleteResource.deps>) {}

  async execute(props: DeleteResourceInput): Promise<DeleteResourceOutput> {
    return await this.deps.resourceRepository.DeleteResource({
      resourceId: props.resourceId,
    });
  }
}
