import { type DepsType, MakeInjectable } from "@solid-stack/di";
import {
	DeviceMismatchError,
	RefreshTokenNotFoundError,
} from "../domain/errors/AuthnErrors.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";

export type LogoutInput = {
	refreshToken: string;
	clientDeviceId: string;
	credentialId?: string | undefined;
	allDevices?: boolean | undefined;
};

export type LogoutOutput = boolean;

@MakeInjectable
export class Logout {
	public static deps = {
		refreshTokenRepo: IRefreshTokenRepo,
	};

	constructor(public deps: DepsType<typeof Logout.deps>) {}

	async execute(props: LogoutInput): Promise<LogoutOutput> {
		if (props.allDevices && props.credentialId) {
			await this.deps.refreshTokenRepo.deleteAllByCredentialId(
				props.credentialId,
			);
			return true;
		}

		if (!props.refreshToken || typeof props.refreshToken !== "string") {
			throw new RefreshTokenNotFoundError("Refresh token is required");
		}

		const session = await this.deps.refreshTokenRepo.findByToken(
			props.refreshToken,
		);

		if (!session) {
			throw new RefreshTokenNotFoundError("Refresh session not found");
		}

		const clientDeviceId = props.clientDeviceId?.trim();
		if (session.clientDeviceId !== clientDeviceId) {
			throw new DeviceMismatchError(
				"Device ID does not match the session device",
			);
		}

		const jti = session.jti || session.id;
		await this.deps.refreshTokenRepo.deleteByDeviceAndJti(clientDeviceId, jti);

		return true;
	}
}
