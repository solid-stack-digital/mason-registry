import type { Container } from "@solid-stack/di";
import { HmacJwtEngine } from "./infrastructure/HmacJwtEngine.js";
import { IJwtEngine } from "./ports/IJwtEngine.js";

export const diProvider = (c: Container): void => {
	c.provide(IJwtEngine, HmacJwtEngine);
};

export default diProvider;
