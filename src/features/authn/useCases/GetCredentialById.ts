import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Credential } from "../domain/Credential.js";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";

export type GetCredentialByIdInput = {
	id: string;
};

export type GetCredentialByIdOutput = Credential | null;

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
			return null;
		}

		const cred = await this.deps.credRepo.findById(props.id);
		if (!cred) {
			return null;
		}

		return cred;
	}
}
