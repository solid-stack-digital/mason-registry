import type { Container } from "@solid-stack/di";
import { TimeError } from "./errors/TimeError.js";
import { StubTimeEngine } from "./infrastructure/StubTimeEngine.js";
import { SystemTimeEngine } from "./infrastructure/SystemTimeEngine.js";
import { ITimeEngine } from "./ports/ITimeEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provide(ITimeEngine, StubTimeEngine);
	} else if (infraMode === "integrated") {
		c.provide(ITimeEngine, SystemTimeEngine);
	} else {
		throw new TimeError(
			"Received an invalid INFRA_MODE env while loading time provider",
		);
	}
};

export default diProvider;
