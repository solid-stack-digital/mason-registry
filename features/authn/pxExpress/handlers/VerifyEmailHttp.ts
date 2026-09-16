import { ExpressRoute } from "@solid-stack/agnos-express";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { VerifyEmail } from "../../useCases/VerifyEmail.js";
import type { Request, Response } from "express";

@MakeInjectable
export default class VerifyEmailHttp extends ExpressRoute {
  public static deps = {
    verifyEmailUc: VerifyEmail,
  };

  constructor(public deps: DepsType<typeof VerifyEmailHttp.deps>) {
    super();
  }

  public method = "post" as const;
  public path = "/verify-email";
  public handler = async (req: Request, res: Response) => {
    const { email, code } = req.body || {};
    const result = await this.deps.verifyEmailUc.execute({
      email,
      code,
    });
    res.status(200).json(result);
  };
}
