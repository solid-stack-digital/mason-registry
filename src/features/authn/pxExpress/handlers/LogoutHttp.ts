import { ExpressRoute } from "@solid-stack/agnos-express";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Request, Response } from "express";
import { Logout } from "../../useCases/Logout.js";

@MakeInjectable
export default class LogoutHttp extends ExpressRoute {
	public static deps = {
		logoutUc: Logout,
	};

	constructor(public deps: DepsType<typeof LogoutHttp.deps>) {
		super();
	}

	public method = "post" as const;
	public path = "/logout";
	public handler = async (req: Request, res: Response) => {
		const { refreshToken, clientDeviceId, credentialId, allDevices } =
			req.body || {};
		const result = await this.deps.logoutUc.execute({
			refreshToken,
			clientDeviceId,
			credentialId,
			allDevices,
		});
		res.status(200).json({ success: result, ok: true });
	};
}
