import type { Container } from "@solid-stack/di";
import { DefaultHmacEngine } from "./infrastructure/DefaultHmacEngine.js";
import { IHmacEngine } from "./ports/IHmacEngine.js";

export const diProvider = (c: Container): void => {
	c.provide(IHmacEngine, DefaultHmacEngine);
};

export default diProvider;
