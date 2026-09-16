import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ChangePassword } from "../../useCases/ChangePassword.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class ChangePasswordHttp extends ExpressRoute {
  public static deps = {
    changePasswordUc: ChangePassword,
  };

  constructor(public deps: DepsType<typeof ChangePasswordHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/change-password";
  public handler = async (req: Request, res: Response) => {
    const { credentialId, currentPassword, newPassword, oldPassword } =
      req.body || {};
    const result = await this.deps.changePasswordUc.execute({
      credentialId,
      currentPassword,
      newPassword,
      oldPassword,
    });
    res.status(200).json(result);
  };
}
