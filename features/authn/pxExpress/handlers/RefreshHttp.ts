import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { Refresh } from "../../useCases/Refresh.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class RefreshHttp extends ExpressRoute {
  public static deps = {
    refreshUc: Refresh,
  };

  constructor(public deps: DepsType<typeof RefreshHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/refresh";
  public handler = async (req: Request, res: Response) => {
    const { refreshToken, clientDeviceId } = req.body || {};
    const result = await this.deps.refreshUc.execute({
      refreshToken,
      clientDeviceId,
    });
    res.status(200).json(result);
  };
}
