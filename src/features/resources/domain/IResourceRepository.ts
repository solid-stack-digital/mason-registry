import type { Resource } from "./Resource.js";

export abstract class IResourceRepository {
  abstract GetResourceById(input: { resourceId: string }): Promise<{ resource: Resource }>;
  abstract ListResources(input?: { page?: number | undefined; limit?: number | undefined }): Promise<{ resources: Resource[]; total?: number | undefined; page?: number | undefined; limit?: number | undefined }>;
  abstract CreateResource(input: { resource: Resource }): Promise<{ resource: Resource }>;
  abstract UpdateResource(input: { resource: Resource }): Promise<{ resource: Resource }>;
  abstract DeleteResource(input: { resourceId: string }): Promise<{ success: boolean }>;
}
