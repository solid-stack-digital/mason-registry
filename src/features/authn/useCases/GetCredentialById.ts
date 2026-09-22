import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { SanitizedCredential } from "../domain/Credential.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";

export type GetCredentialByIdInput = {
	id: string;
};

export type GetCredentialByIdOutput = {
	credential: SanitizedCredential;
};

@MakeInjectable
export class GetCredentialById {
	public static deps = {
		credRepo: ICredentialRepo,
	};

	constructor(public deps: DepsType<typeof GetCredentialById.deps>) {}

	async execute(
		props: GetCredentialByIdInput,
	): Promise<GetCredentialByIdOutput> {
		if (!props.id || typeof props.id !== "string") {
			throw new Error("Credential ID is required");
		}

		const cred = await this.deps.credRepo.findById(props.id);
		if (!cred) {
			throw new Error(`Credential not found with id: ${props.id}`);
		}

		return {
			credential: {
				id: cred.id,
				email: cred.email,
				isVerified: cred.isVerified,
				createdAt: cred.createdAt,
				updatedAt: cred.updatedAt,
			},
		};
	}
}
