import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ResetPassword } from "../../useCases/ResetPassword.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class ResetPasswordHttp extends ExpressRoute {
  public static deps = {
    resetPasswordUc: ResetPassword,
  };

  constructor(public deps: DepsType<typeof ResetPasswordHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/reset-password";
  public handler = async (req: Request, res: Response) => {
    const { email, code, newPassword, password } = req.body || {};
    const result = await this.deps.resetPasswordUc.execute({
      email,
      code,
      newPassword,
      password,
    });
    res.status(200).json(result);
  };
}
