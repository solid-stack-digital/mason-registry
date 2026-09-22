import type { Container } from "@solid-stack/di";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";
import { IHashEngine } from "./ports/IHashEngine.js";

export const diProvider = (c: Container): void => {
	c.provide(IHashEngine, ScryptHashEngine);
};

export default diProvider;
