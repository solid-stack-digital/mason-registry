import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { Login } from "../../useCases/Login.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class LoginHttp extends ExpressRoute {
  public static deps = {
    loginUc: Login,
  };

  constructor(public deps: DepsType<typeof LoginHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/login";
  public handler = async (req: Request, res: Response) => {
    const { email, password, clientDeviceId } = req.body || {};
    const result = await this.deps.loginUc.execute({
      email,
      password,
      clientDeviceId,
    });
    res.status(200).json(result);
  };
}
