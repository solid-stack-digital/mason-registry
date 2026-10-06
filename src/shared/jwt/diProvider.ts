import type { Container } from "@solid-stack/di";
import { SecretToken } from "./configs/SecretToken.js";
import { JwtError } from "./errors/JwtError.js";
import { JwtEngine } from "./infrastructure/JwtEngine.js";
import { IJwtEngine } from "./ports/IJwtEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infra_mode = process.env.INFRA_MODE || "isolated";

	// TODO: load the actual token
	c.provideValue(SecretToken, "example-token");

	if (infra_mode === "isolated") {
		c.provide(IJwtEngine, JwtEngine);
	} else if (infra_mode === "integrated") {
		c.provide(IJwtEngine, JwtEngine);
	} else {
		throw new JwtError(
			"Received an invalid INFRA_MODE env while loading jwt provider",
		);
	}
};

export default diProvider;
