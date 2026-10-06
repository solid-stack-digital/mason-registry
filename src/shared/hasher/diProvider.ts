import type { Container } from "@solid-stack/di";
import { HasherError } from "./errors/HasherError.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";
import { IHashEngine } from "./ports/IHashEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provide(IHashEngine, ScryptHashEngine);
	} else if (infraMode === "integrated") {
		c.provide(IHashEngine, ScryptHashEngine);
	} else {
		throw new HasherError(
			"Received an invalid INFRA_MODE env while loading hasher provider",
		);
	}
};

export default diProvider;
