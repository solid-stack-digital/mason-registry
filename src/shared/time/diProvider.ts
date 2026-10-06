import type { Container } from "@solid-stack/di";
import { TimeError } from "./errors/TimeError.js";
import { SystemTimeEngine } from "./infrastructure/SystemTimeEngine.js";
import { ITimeEngine } from "./ports/ITimeEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new TimeError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	c.provide(ITimeEngine, SystemTimeEngine);
};

export default diProvider;
