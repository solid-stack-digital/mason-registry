import type { Container } from "@solid-stack/di";
import { HmacError } from "./errors/HmacError.js";
import { DefaultHmacEngine } from "./infrastructure/DefaultHmacEngine.js";
import { IHmacEngine } from "./ports/IHmacEngine.js";

export const HmacProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new HmacError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	c.provide(IHmacEngine, DefaultHmacEngine);
};

export default HmacProvider;
