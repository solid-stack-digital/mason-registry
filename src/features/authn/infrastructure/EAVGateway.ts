import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { ConsumeEmailAccessToken } from "@/features/emailAccessVerification/useCases/ConsumeEmailAccessToken.js";
import type {
	ConsumeEmailAccessTokenPayload,
	IEAVGateway,
} from "../domain/IEAVGateway.js";

@MakeInjectable
export class EAVGateway implements IEAVGateway {
	public static deps = {
		consumeEmailAccessToken: ConsumeEmailAccessToken,
	};

	constructor(public deps: DepsType<typeof EAVGateway.deps>) {}

	async consumeEmailAccessToken(
		payload: ConsumeEmailAccessTokenPayload,
	): Promise<boolean> {
		return this.deps.consumeEmailAccessToken.execute(payload);
	}
}
