import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { RegisterAccount } from "../../useCases/RegisterAccount.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class RegisterAccountHttp extends ExpressRoute {
  public static deps = {
    registerAccountUc: RegisterAccount,
  };

  constructor(public deps: DepsType<typeof RegisterAccountHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/register";
  public handler = async (req: Request, res: Response) => {
    const { email, password, id } = req.body || {};
    const result = await this.deps.registerAccountUc.execute({
      email,
      password,
      id,
    });
    res.status(201).json(result);
  };
}
