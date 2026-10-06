import { type DepsType, MakeInjectable } from "@solid-stack/di";
import {
	type HmacData,
	type HmacOptions,
	IHmacEngine,
} from "./ports/IHmacEngine.js";

@MakeInjectable
export class Hmac {
	public static deps = { hmacEngine: IHmacEngine };
	constructor(public readonly deps: DepsType<typeof Hmac.deps>) {}

	sign(data: HmacData, options?: HmacOptions): string {
		return this.deps.hmacEngine.sign(data, options);
	}

	compute(data: HmacData, options?: HmacOptions): string {
		return this.deps.hmacEngine.sign(data, options);
	}

	verify(
		data: HmacData,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean {
		return this.deps.hmacEngine.verify(data, expectedDigest, options);
	}
}
