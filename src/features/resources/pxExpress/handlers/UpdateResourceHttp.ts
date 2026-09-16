import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import type { Request, Response } from "express";
import { z } from "zod";
import { UpdateResource } from "../../useCases/UpdateResource.js";

export type HttpResponseStatus = "info" | "success" | "redirect" | "fail" | "error";

export interface HttpResponse<T = object> {
  status: HttpResponseStatus;
  message: string;
  data?: T;
}

const updateResourceHttpSchema = z.object({
  resource: z.any(),
});

@MakeInjectable
export default class UpdateResourceHttp extends ExpressRoute {
  public static deps = {
    updateResource: UpdateResource,
  };

  constructor(public deps: DepsType<typeof UpdateResourceHttp.deps>) {
    super();
  }

  public method = "put" as const;
  public path = "/:resourceId";
  public handler = async (req: Request, res: Response) => {
    const parsed = updateResourceHttpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        data: parsed.error.format(),
      });
    }
    const result = await this.deps.updateResource.execute(parsed.data);
    return res.status(200).json({
      status: "success",
      message: "Resource updated successfully",
      data: result,
    });
  };
}
