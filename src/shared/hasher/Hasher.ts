import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { IHashEngine } from "./ports/IHashEngine.js";

@MakeInjectable
export class Hasher {
	public static deps = { hashEngine: IHashEngine };
	constructor(public readonly deps: DepsType<typeof Hasher.deps>) {}

	async hash(plain: string): Promise<string> {
		return this.deps.hashEngine.hash(plain);
	}

	async verify(plain: string, hashed: string): Promise<boolean> {
		return this.deps.hashEngine.verify(plain, hashed);
	}
}
