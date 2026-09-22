import { type DepsType, MakeInjectable } from "@solid-stack/di";
import {
	type HmacEncoding,
	type HmacInput,
	type HmacOptions,
	IHmacEngine,
} from "./ports/IHmacEngine.js";

@MakeInjectable
export class Hmac {
	public static deps = { hmacEngine: IHmacEngine };
	constructor(public readonly deps: DepsType<typeof Hmac.deps>) {}

	sign(data: HmacInput, secret: HmacInput, options?: HmacOptions): string {
		return this.deps.hmacEngine.sign(data, secret, options);
	}

	compute(data: HmacInput, secret: HmacInput, options?: HmacOptions): string {
		return this.deps.hmacEngine.sign(data, secret, options);
	}

	verify(
		data: HmacInput,
		secret: HmacInput,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		return this.deps.hmacEngine.verify(data, secret, expectedDigest, options);
	}

	generateSecret(bytes: number = 32, encoding: HmacEncoding = "hex"): string {
		return this.deps.hmacEngine.generateSecret(bytes, encoding);
	}
}
