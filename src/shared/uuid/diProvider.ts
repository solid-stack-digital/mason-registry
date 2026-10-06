import type { Container } from "@solid-stack/di";
import { UuidError } from "./errors/UuidError.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { IIdGenerator } from "./ports/IIdGenerator.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new UuidError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	c.provide(IIdGenerator, CryptoIdGenerator);
};

export default diProvider;
