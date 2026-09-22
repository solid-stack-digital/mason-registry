import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import {
	AccountAlreadyVerifiedError,
	AccountNotFoundError,
	InvalidTokenError,
} from "../domain/errors/AuthnErrors.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IEAVGateway } from "../domain/IEAVGateway.js";

export type VerifyEmailInput = {
	email: string;
	emailAccessToken: string;
	purpose?: string | undefined;
};

export type VerifyEmailOutput = boolean;

@MakeInjectable
export class VerifyEmail {
	public static deps = {
		credRepo: ICredentialRepo,
		eavGateway: IEAVGateway,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof VerifyEmail.deps>) {}

	async execute(props: VerifyEmailInput): Promise<VerifyEmailOutput> {
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

		if (cred.isVerified) {
			throw new AccountAlreadyVerifiedError("Email is already verified");
		}

		const purpose = props.purpose || "email_verification";
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

		cred.isVerified = true;
		cred.updatedAt = this.deps.clock.now();
		await this.deps.credRepo.update(cred);

		return true;
	}
}
