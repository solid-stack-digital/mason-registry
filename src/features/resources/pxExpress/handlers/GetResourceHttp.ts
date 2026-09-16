import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import type { Request, Response } from "express";
import { z } from "zod";
import { GetResource } from "../../useCases/GetResource.js";

export type HttpResponseStatus = "info" | "success" | "redirect" | "fail" | "error";

export interface HttpResponse<T = object> {
  status: HttpResponseStatus;
  message: string;
  data?: T;
}

const getResourceHttpSchema = z.object({
  resourceId: z.string(),
});

@MakeInjectable
export default class GetResourceHttp extends ExpressRoute {
  public static deps = {
    getResource: GetResource,
  };

  constructor(public deps: DepsType<typeof GetResourceHttp.deps>) {
    super();
  }

  public method = "get" as const;
  public path = "/:resourceId";
  public handler = async (req: Request, res: Response) => {
    const parsed = getResourceHttpSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        data: parsed.error.format(),
      });
    }
    const result = await this.deps.getResource.execute(parsed.data);
    return res.status(200).json({
      status: "success",
      message: "Resource retrieved successfully",
      data: result,
    });
  };
}
