import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";

export type VerifyEmailInput = {
	email: string;
	code: string;
};

export type VerifyEmailOutput = {
	isVerified: boolean;
};

@MakeInjectable
export class VerifyEmail {
	public static deps = {
		credRepo: ICredentialRepo,
		otpGateway: IOtpGateway,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof VerifyEmail.deps>) {}

	async execute(props: VerifyEmailInput): Promise<VerifyEmailOutput> {
		if (!props.email || !props.code) {
			throw new Error("Email and OTP code are required for verification");
		}

		const email = props.email.trim().toLowerCase();
		const cred = await this.deps.credRepo.findByEmail(email);

		if (!cred) {
			throw new Error(`Account with email ${email} not found`);
		}

		if (cred.isVerified) {
			return { isVerified: true };
		}

		// Validate OTP
		const validationResult = await this.deps.otpGateway.validateOtp({
			recipientId: cred.id,
			code: props.code,
			purpose: "EMAIL_VERIFICATION",
		});

		if (!validationResult.valid) {
			throw new Error("Invalid or expired verification code");
		}

		cred.isVerified = true;
		cred.updatedAt = this.deps.clock.now();
		await this.deps.credRepo.update(cred);

		return { isVerified: true };
	}
}
