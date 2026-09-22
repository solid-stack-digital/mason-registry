import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { DecodedEmailAccessPayload } from "../domain/EmailAccess.js";
import { DecodeAndValidateToken } from "../services/DecodeAndValidateToken.js";

export interface DecodeEmailAccessTokenInput {
	token: string;
	purpose: string;
}

export type DecodeEmailAccessTokenOutput = DecodedEmailAccessPayload;

@MakeInjectable
export class DecodeEmailAccessToken {
	public static deps = {
		decodeAndValidateToken: DecodeAndValidateToken,
	};

	constructor(public deps: DepsType<typeof DecodeEmailAccessToken.deps>) {}

	async execute(
		props: DecodeEmailAccessTokenInput,
	): Promise<DecodeEmailAccessTokenOutput> {
		// 1. Decoded = services.decodeandvalidatetoken
		const decoded = await this.deps.decodeAndValidateToken.execute({
			token: props.token,
			purpose: props.purpose,
		});

		// 2. Return decoded.
		return decoded;
	}
}
