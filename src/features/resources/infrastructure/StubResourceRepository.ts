import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IResourceRepository } from "../domain/IResourceRepository.js";
import type { Resource } from "../domain/Resource.js";

@MakeInjectable
export class StubResourceRepository implements IResourceRepository {
  public static deps = {};

  private resources: Map<string, Resource> = new Map();
  private errorToThrow: Error | null = null;

  constructor(public deps: DepsType<typeof StubResourceRepository.deps>) {}

  // --- Test Helpers ---
  public clear(): void {
    this.resources.clear();
    this.errorToThrow = null;
  }

  public addResource(resource: Resource): void {
    this.resources.set(resource.id, { ...resource });
  }

  public getResources(): Resource[] {
    return Array.from(this.resources.values()).map((e) => ({ ...e }));
  }

  public setError(error: Error | null): void {
    this.errorToThrow = error;
  }

  // --- IResourceRepository Methods ---
  async GetResourceById(input: { resourceId: string }): Promise<{ resource: Resource }> {
    if (this.errorToThrow) throw this.errorToThrow;
    const found = this.resources.get(input.resourceId);
    if (!found) throw new Error("Resource with ID " + input.resourceId + " not found");
    return { resource: { ...found } };
  }

  async ListResources(input?: { page?: number | undefined; limit?: number | undefined }): Promise<{ resources: Resource[]; total?: number | undefined; page?: number | undefined; limit?: number | undefined }> {
    if (this.errorToThrow) throw this.errorToThrow;
    let all = this.getResources();
    const total = all.length;
    if (input?.page && input?.limit) {
      const start = (input.page - 1) * input.limit;
      all = all.slice(start, start + input.limit);
      return { resources: all, total, page: input.page, limit: input.limit };
    }
    return { resources: all, total };
  }

  async CreateResource(input: { resource: Resource }): Promise<{ resource: Resource }> {
    if (this.errorToThrow) throw this.errorToThrow;
    const entity = { ...input.resource };
    this.resources.set(entity.id, entity);
    return { resource: { ...entity } };
  }

  async UpdateResource(input: { resource: Resource }): Promise<{ resource: Resource }> {
    if (this.errorToThrow) throw this.errorToThrow;
    if (!this.resources.has(input.resource.id)) {
      throw new Error("Resource with ID " + input.resource.id + " not found");
    }
    const entity = { ...input.resource };
    this.resources.set(entity.id, entity);
    return { resource: { ...entity } };
  }

  async DeleteResource(input: { resourceId: string }): Promise<{ success: boolean }> {
    if (this.errorToThrow) throw this.errorToThrow;
    this.resources.delete(input.resourceId);
    return { success: true };
  }
}
