import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { Duration } from "@/shared/time/domain/index.js";
import { Clock } from "../time/Clock.js";
import { IJwtEngine } from "./ports/IJwtEngine.js";

@MakeInjectable
export class Jwt {
	public static deps = {
		jwtEngine: IJwtEngine,
		clock: Clock,
	};
	constructor(public readonly deps: DepsType<typeof Jwt.deps>) {}

	async sign(payload: unknown, options: { ttl: Duration }): Promise<string> {
		return this.deps.jwtEngine.sign(payload, options.ttl);
	}

	async verify<T = unknown>(token: string): Promise<T> {
		return this.deps.jwtEngine.verify<T>(token);
	}
}
