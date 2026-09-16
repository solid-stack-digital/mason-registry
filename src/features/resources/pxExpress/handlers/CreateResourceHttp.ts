import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import type { Request, Response } from "express";
import { z } from "zod";
import { CreateResource } from "../../useCases/CreateResource.js";

export type HttpResponseStatus = "info" | "success" | "redirect" | "fail" | "error";

export interface HttpResponse<T = object> {
  status: HttpResponseStatus;
  message: string;
  data?: T;
}

const createResourceHttpSchema = z.object({
  resource: z.any(),
});

@MakeInjectable
export default class CreateResourceHttp extends ExpressRoute {
  public static deps = {
    createResource: CreateResource,
  };

  constructor(public deps: DepsType<typeof CreateResourceHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/";
  public handler = async (req: Request, res: Response) => {
    const parsed = createResourceHttpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        data: parsed.error.format(),
      });
    }
    const result = await this.deps.createResource.execute(parsed.data);
    return res.status(201).json({
      status: "success",
      message: "Resource created successfully",
      data: result,
    });
  };
}
