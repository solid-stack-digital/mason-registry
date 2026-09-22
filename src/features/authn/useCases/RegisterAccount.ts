import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Clock } from "@/shared/time/Clock.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import type { Credential } from "../domain/Credential.js";
import {
	AccountAlreadyExistsError,
	InvalidEmailError,
	WeakPasswordError,
} from "../domain/errors/AuthnErrors.js";
import { events } from "../domain/events/index.js";
import { IAuthnEventPublisher } from "../domain/IAuthnEventPublisher.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";

export type RegisterAccountInput = {
	email: string;
	password: string;
	id?: string | undefined;
};

export type RegisterAccountOutput = string;

@MakeInjectable
export class RegisterAccount {
	public static deps = {
		credRepo: ICredentialRepo,
		hasher: Hasher,
		uuid: Uuid,
		clock: Clock,
		eventPublisher: IAuthnEventPublisher,
	};

	constructor(public deps: DepsType<typeof RegisterAccount.deps>) {}

	async execute(props: RegisterAccountInput): Promise<RegisterAccountOutput> {
		if (
			!props.email ||
			typeof props.email !== "string" ||
			!props.email.includes("@")
		) {
			throw new InvalidEmailError("A valid email is required");
		}

		if (!props.password || props.password.length < 8) {
			throw new WeakPasswordError("Password must be at least 8 characters");
		}

		const email = props.email.trim().toLowerCase();
		const existing = await this.deps.credRepo.findByEmail(email);
		if (existing) {
			throw new AccountAlreadyExistsError(
				"An account with this email already exists",
			);
		}

		const passwordHash = await this.deps.hasher.hash(props.password);
		const credId = props.id || this.deps.uuid.generate();
		const now = this.deps.clock.now();

		const cred: Credential = {
			id: credId,
			email,
			passwordHash,
			isVerified: false,
			createdAt: now,
			updatedAt: now,
		};

		await this.deps.credRepo.save(cred);

		await this.deps.eventPublisher.publish(
			new events.AccountRegisteredEvent({
				credId: cred.id,
				email: cred.email,
			}),
		);

		return cred.id;
	}
}
