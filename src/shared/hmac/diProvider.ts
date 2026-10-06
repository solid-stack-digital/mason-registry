import type { Container } from "@solid-stack/di";
import { HmacError } from "./errors/HmacError.js";
import { DefaultHmacEngine } from "./infrastructure/DefaultHmacEngine.js";
import { IHmacEngine } from "./ports/IHmacEngine.js";

export const HmacProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infra_mode = process.env.INFRA_MODE || "isolated";

	if (infra_mode === "isolated") {
		c.provide(IHmacEngine, DefaultHmacEngine);
	} else if (infra_mode === "integrated") {
		c.provide(IHmacEngine, DefaultHmacEngine);
	} else {
		throw new HmacError(
			"Received an invalid INFRA_MODE env while loading hmac provider",
		);
	}
};

export default HmacProvider;
