import type { Container } from "@solid-stack/di";
import { HasherError } from "./errors/HasherError.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";
import { IHashEngine } from "./ports/IHashEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new HasherError(
			"Invalid INFRA_MODE: expected isolated or integrated",
		);
	}
	c.provide(IHashEngine, ScryptHashEngine);
};

export default diProvider;
