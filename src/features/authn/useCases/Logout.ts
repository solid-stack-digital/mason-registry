import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";

export type LogoutInput = {
	refreshToken?: string | undefined;
	clientDeviceId?: string | undefined;
	credentialId?: string | undefined;
	allDevices?: boolean | undefined;
};

export type LogoutOutput = {
	ok: boolean;
};

@MakeInjectable
export class Logout {
	public static deps = {
		refreshTokenRepo: IRefreshTokenRepo,
	};

	constructor(public deps: DepsType<typeof Logout.deps>) {}

	async execute(props: LogoutInput): Promise<LogoutOutput> {
		if (props.allDevices && props.credentialId) {
			await this.deps.refreshTokenRepo.revokeAllByCredentialId(
				props.credentialId,
			);
			return { ok: true };
		}

		if (!props.refreshToken || typeof props.refreshToken !== "string") {
			throw new Error("Refresh token is required");
		}

		const stored = await this.deps.refreshTokenRepo.findByToken(
			props.refreshToken,
		);

		if (!stored) {
			// Idempotent success if already deleted/logged out
			return { ok: true };
		}

		if (
			props.clientDeviceId &&
			stored.clientDeviceId !== props.clientDeviceId.trim()
		) {
			throw new Error("Device ID does not match the session device");
		}

		await this.deps.refreshTokenRepo.deleteByToken(props.refreshToken);

		return { ok: true };
	}
}
