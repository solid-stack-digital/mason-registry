import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";

export interface RequestEmailAccessVerificationInput {
	email: string;
	purpose: string;
}

export interface RequestEmailAccessVerificationOutput {
	success: boolean;
	otpCode?: string | undefined;
}

@MakeInjectable
export class RequestEmailAccessVerification {
	public static deps = {
		emailAccessRepo: IEmailAccessRepository,
		otpGateway: IOtpGateway,
	};

	constructor(
		public deps: DepsType<typeof RequestEmailAccessVerification.deps>,
	) {}

	async execute(
		props: RequestEmailAccessVerificationInput,
	): Promise<RequestEmailAccessVerificationOutput> {
		if (
			!props.email ||
			typeof props.email !== "string" ||
			props.email.trim() === ""
		) {
			throw new Error("Email is required");
		}
		if (
			!props.purpose ||
			typeof props.purpose !== "string" ||
			props.purpose.trim() === ""
		) {
			throw new Error("Purpose is required");
		}

		const email = props.email.trim().toLowerCase();
		const purpose = props.purpose.trim();

		// 1. Check if a jwt already exists for email + purpose:
		// If yes, invalidate and clear them all.
		const existingActive =
			await this.deps.emailAccessRepo.findActiveByEmailAndPurpose(
				email,
				purpose,
			);
		if (existingActive.length > 0) {
			await this.deps.emailAccessRepo.invalidateAllForEmailAndPurpose(
				email,
				purpose,
			);
		}

		// 2. Try otp.sendotp
		// If failed: Determine reason and throw according to the reason
		const result = await this.deps.otpGateway.sendOtp({
			recipientId: email,
			recipientEmail: email,
			purpose,
			mode: "email",
		});

		return {
			success: true,
			otpCode: result.otpCode,
		};
	}
}
