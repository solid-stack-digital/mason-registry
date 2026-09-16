import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import type { Request, Response } from "express";
import { z } from "zod";
import { ListResources } from "../../useCases/ListResources.js";

export type HttpResponseStatus = "info" | "success" | "redirect" | "fail" | "error";

export interface HttpResponse<T = object> {
  status: HttpResponseStatus;
  message: string;
  data?: T;
}

const listResourcesHttpSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});

@MakeInjectable
export default class ListResourcesHttp extends ExpressRoute {
  public static deps = {
    listResources: ListResources,
  };

  constructor(public deps: DepsType<typeof ListResourcesHttp.deps>) {
    super();
  }

  public method = "get" as const;
  public path = "/";
  public handler = async (req: Request, res: Response) => {
    const parsed = listResourcesHttpSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        data: parsed.error.format(),
      });
    }
    const result = await this.deps.listResources.execute(parsed.data);
    return res.status(200).json({
      status: "success",
      message: "Resources retrieved successfully",
      data: result,
    });
  };
}
