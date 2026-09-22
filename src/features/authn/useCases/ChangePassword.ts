import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";

export type ChangePasswordInput = {
	credentialId: string;
	currentPassword?: string;
	newPassword?: string;
	oldPassword?: string;
};

export type ChangePasswordOutput = {
	ok: boolean;
};

@MakeInjectable
export class ChangePassword {
	public static deps = {
		credRepo: ICredentialRepo,
		refreshTokenRepo: IRefreshTokenRepo,
		hasher: Hasher,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof ChangePassword.deps>) {}

	async execute(props: ChangePasswordInput): Promise<ChangePasswordOutput> {
		const cred = await this.deps.credRepo.findById(props.credentialId);
		if (!cred) {
			throw new Error(`Credential with id ${props.credentialId} not found`);
		}

		const currentPwd = props.currentPassword || props.oldPassword;
		const newPwd = props.newPassword;

		if (!currentPwd) {
			throw new Error("Current password is required");
		}

		if (!newPwd) {
			throw new Error("New password is required");
		}

		if (newPwd.length < 8) {
			throw new Error("New password must be at least 8 characters");
		}

		const isMatch = await this.deps.hasher.compare(
			cred.passwordHash,
			currentPwd,
		);
		if (!isMatch) {
			throw new Error("Incorrect current password");
		}

		const passwordHash = await this.deps.hasher.hash(newPwd);
		cred.passwordHash = passwordHash;
		cred.updatedAt = this.deps.clock.now();
		await this.deps.credRepo.update(cred);

		// Invalidate all active sessions upon password change
		await this.deps.refreshTokenRepo.revokeAllByCredentialId(cred.id);

		return { ok: true };
	}
}
