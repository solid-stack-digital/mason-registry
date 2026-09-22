import { ExpressRoute } from "@solid-stack/agnos-express";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Request, Response } from "express";
import { RegisterAccount } from "../../useCases/RegisterAccount.js";

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
		res
			.status(201)
			.json(typeof result === "string" ? { credentialId: result } : result);
	};
}
