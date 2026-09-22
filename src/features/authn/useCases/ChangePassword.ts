import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import {
	AccountNotFoundError,
	DeviceMismatchError,
	PasswordMismatchError,
	RefreshTokenNotFoundError,
	WeakPasswordError,
} from "../domain/errors/AuthnErrors.js";
import { events } from "../domain/events/index.js";
import { IAuthnEventPublisher } from "../domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";

export type ChangePasswordInput = {
	refreshtoken?: string | undefined;
	refreshToken?: string | undefined;
	clientDeviceId: string;
	currentPassword: string;
	newPassword: string;
	credentialId?: string | undefined;
	oldPassword?: string | undefined;
};

export type ChangePasswordOutput = boolean;

@MakeInjectable
export class ChangePassword {
	public static deps = {
		credRepo: ICredentialRepo,
		refreshTokenRepo: IRefreshTokenRepo,
		hasher: Hasher,
		clock: Clock,
		eventPublisher: IAuthnEventPublisher,
	};

	constructor(public deps: DepsType<typeof ChangePassword.deps>) {}

	async execute(props: ChangePasswordInput): Promise<ChangePasswordOutput> {
		const tokenStr = props.refreshtoken || props.refreshToken;
		let credId = props.credentialId;

		if (tokenStr) {
			const session = await this.deps.refreshTokenRepo.findByToken(tokenStr);
			if (!session) {
				throw new RefreshTokenNotFoundError(
					"Invalid or unrecognized refresh token",
				);
			}
			const clientDeviceId = props.clientDeviceId?.trim();
			if (clientDeviceId && session.clientDeviceId !== clientDeviceId) {
				throw new DeviceMismatchError(
					"Client device ID does not match the session device",
				);
			}
			credId = session.credentialId;
		}

		if (!credId) {
			throw new AccountNotFoundError("Credential does not exist");
		}

		const cred = await this.deps.credRepo.findById(credId);
		if (!cred) {
			throw new AccountNotFoundError(`Credential with id ${credId} not found`);
		}

		const currentPwd = props.currentPassword || props.oldPassword;
		if (!currentPwd) {
			throw new PasswordMismatchError("Current password is required");
		}

		const isMatch = await this.deps.hasher.verify(
			currentPwd,
			cred.passwordHash,
		);
		if (!isMatch) {
			throw new PasswordMismatchError("Incorrect current password");
		}

		if (!props.newPassword || props.newPassword.length < 8) {
			throw new WeakPasswordError("New password must be at least 8 characters");
		}

		const passwordHash = await this.deps.hasher.hash(props.newPassword);
		cred.passwordHash = passwordHash;
		cred.updatedAt = this.deps.clock.now();
		await this.deps.credRepo.update(cred);

		// Delete all sessions of the credential EXCEPT the one matching clientDeviceId
		const clientDeviceId = props.clientDeviceId?.trim() || "";
		await this.deps.refreshTokenRepo.deleteAllByCredentialExceptDevice(
			cred.id,
			clientDeviceId,
		);

		// Emit PasswordChangedEvent
		await this.deps.eventPublisher.publish(
			new events.PasswordChangedEvent({ credId: cred.id }),
		);

		return true;
	}
}
