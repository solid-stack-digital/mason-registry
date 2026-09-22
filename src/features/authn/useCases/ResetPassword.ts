import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import {
	AccountNotFoundError,
	InvalidTokenError,
	WeakPasswordError,
} from "../domain/errors/AuthnErrors.js";
import { events } from "../domain/events/index.js";
import { IAuthnEventPublisher } from "../domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IEAVGateway } from "../domain/IEAVGateway.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";

export type ResetPasswordInput = {
	email: string;
	emailAccessToken: string;
	newPassword: string;
	purpose?: string | undefined;
};

export type ResetPasswordOutput = boolean;

@MakeInjectable
export class ResetPassword {
	public static deps = {
		credRepo: ICredentialRepo,
		refreshTokenRepo: IRefreshTokenRepo,
		hasher: Hasher,
		eavGateway: IEAVGateway,
		clock: Clock,
		eventPublisher: IAuthnEventPublisher,
	};

	constructor(public deps: DepsType<typeof ResetPassword.deps>) {}

	async execute(props: ResetPasswordInput): Promise<ResetPasswordOutput> {
		if (!props.email) {
			throw new AccountNotFoundError("Email is required");
		}

		if (!props.emailAccessToken) {
			throw new InvalidTokenError("emailAccessToken is required");
		}

		const email = props.email.trim().toLowerCase();
		const cred = await this.deps.credRepo.findByEmail(email);
		if (!cred) {
			throw new AccountNotFoundError(`Account with email ${email} not found`);
		}

		// Try IEAVGateway.consumeEmailAccessToken
		const purpose = props.purpose || "password_reset";
		const consumed = await this.deps.eavGateway.consumeEmailAccessToken({
			token: props.emailAccessToken,
			purpose,
			email: cred.email,
		});

		if (!consumed) {
			throw new InvalidTokenError(
				"Failed to consume email access token: invalid or expired",
			);
		}

		// Hash new pass
		if (!props.newPassword || props.newPassword.length < 8) {
			throw new WeakPasswordError("Password must be at least 8 characters");
		}
		const passwordHash = await this.deps.hasher.hash(props.newPassword);

		// Update credential
		cred.passwordHash = passwordHash;
		cred.updatedAt = this.deps.clock.now();

		// Save credential to repo
		await this.deps.credRepo.update(cred);

		// Call session repo to delete all sessions of the credential on all devices
		await this.deps.refreshTokenRepo.deleteAllByCredentialId(cred.id);
		await this.deps.refreshTokenRepo.revokeAllByCredentialId(cred.id);

		// Emit PasswordChangedEvent
		await this.deps.eventPublisher.publish(
			new events.PasswordChangedEvent({ credId: cred.id }),
		);

		return true;
	}
}
