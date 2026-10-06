import type { Container } from "@solid-stack/di";
import { UuidError } from "./errors/UuidError.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { StubIdGenerator } from "./infrastructure/StubIdGenerator.js";
import { IIdGenerator } from "./ports/IIdGenerator.js";

export const diProvider = (c: Container): void => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provide(IIdGenerator, StubIdGenerator);
	} else if (infraMode === "integrated") {
		c.provide(IIdGenerator, CryptoIdGenerator);
	} else {
		throw new UuidError(
			"Received an invalid INFRA_MODE env while loading uuid provider",
		);
	}
};

export default diProvider;
