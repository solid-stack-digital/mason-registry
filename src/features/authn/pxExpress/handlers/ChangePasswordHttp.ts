import { ExpressRoute } from "@solid-stack/agnos-express";
import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Request, Response } from "express";
import { ChangePassword } from "../../useCases/ChangePassword.js";

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
		const {
			refreshtoken,
			refreshToken,
			clientDeviceId,
			currentPassword,
			newPassword,
			credentialId,
			oldPassword,
		} = req.body || {};
		const result = await this.deps.changePasswordUc.execute({
			refreshtoken: refreshtoken || refreshToken,
			refreshToken: refreshToken || refreshtoken,
			clientDeviceId,
			currentPassword: currentPassword || oldPassword,
			newPassword,
			credentialId,
		});
		res.status(200).json({ success: result, ok: true });
	};
}
