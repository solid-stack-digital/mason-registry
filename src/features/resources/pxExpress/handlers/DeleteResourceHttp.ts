import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import type { Request, Response } from "express";
import { z } from "zod";
import { DeleteResource } from "../../useCases/DeleteResource.js";

export type HttpResponseStatus = "info" | "success" | "redirect" | "fail" | "error";

export interface HttpResponse<T = object> {
  status: HttpResponseStatus;
  message: string;
  data?: T;
}

const deleteResourceHttpSchema = z.object({
  resourceId: z.string(),
});

@MakeInjectable
export default class DeleteResourceHttp extends ExpressRoute {
  public static deps = {
    deleteResource: DeleteResource,
  };

  constructor(public deps: DepsType<typeof DeleteResourceHttp.deps>) {
    super();
  }

  public method = "delete" as const;
  public path = "/:resourceId";
  public handler = async (req: Request, res: Response) => {
    const parsed = deleteResourceHttpSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        data: parsed.error.format(),
      });
    }
    const result = await this.deps.deleteResource.execute(parsed.data);
    return res.status(200).json({
      status: "success",
      message: "Resource deleted successfully",
      data: result,
    });
  };
}
