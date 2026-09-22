import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { EmailAccessEmailMismatchError } from "../domain/errors/EmailAccessErrors.js";
import { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";
import { DecodeAndValidateToken } from "../services/DecodeAndValidateToken.js";

export interface ConsumeEmailAccessTokenInput {
	token: string;
	purpose: string;
	email: string;
}

@MakeInjectable
export class ConsumeEmailAccessToken {
	public static deps = {
		decodeAndValidateToken: DecodeAndValidateToken,
		emailAccessRepo: IEmailAccessRepository,
		clock: Clock,
	};

	constructor(public deps: DepsType<typeof ConsumeEmailAccessToken.deps>) {}

	async execute(props: ConsumeEmailAccessTokenInput): Promise<boolean> {
		if (
			!props.email ||
			typeof props.email !== "string" ||
			props.email.trim() === ""
		) {
			throw new EmailAccessEmailMismatchError("Email is required");
		}

		// 1. Decoded = services.decodeandvalidatetoken
		const decoded = await this.deps.decodeAndValidateToken.execute({
			token: props.token,
			purpose: props.purpose,
		});

		// 2. If email different from email in decoded, throw;
		const normalizedInputEmail = props.email.trim().toLowerCase();
		const normalizedDecodedEmail = decoded.email.trim().toLowerCase();
		if (normalizedInputEmail !== normalizedDecodedEmail) {
			throw new EmailAccessEmailMismatchError(
				`Email '${props.email}' does not match token email '${decoded.email}'`,
			);
		}

		// 3. Invalidate the access token in the repository
		const record = await this.deps.emailAccessRepo.findByJti(decoded.jti);
		if (record) {
			record.isUsed = true;
			record.isInvalidated = true;
			record.updatedAt = this.deps.clock.now();
			await this.deps.emailAccessRepo.update(record);
		}

		// 4. Return true;
		return true;
	}
}
