import type { Container } from "@solid-stack/di";
import { SecretToken } from "./configs/SecretToken.js";
import { JwtError } from "./errors/JwtError.js";
import { JwtEngine } from "./infrastructure/JwtEngine.js";
import { IJwtEngine } from "./ports/IJwtEngine.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new JwtError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	// TODO: After import, resolve your application's Environment token and forward its JWT_SECRET to the local SecretToken.
	c.provideValue(SecretToken, "example-token");
	c.provide(IJwtEngine, JwtEngine);
};

export default diProvider;
