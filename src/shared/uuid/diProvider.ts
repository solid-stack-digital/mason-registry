import type { Container } from "@solid-stack/di";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { IIdGenerator } from "./ports/IIdGenerator.js";

export const diProvider = (c: Container): void => {
	c.provide(IIdGenerator, CryptoIdGenerator);
};

export default diProvider;
