import type { Container } from "@solid-stack/di";
import { SystemTimeEngine } from "./infrastructure/SystemTimeEngine.js";
import { ITimeEngine } from "./ports/ITimeEngine.js";

export const diProvider = (c: Container): void => {
	c.provide(ITimeEngine, SystemTimeEngine);
};

export default diProvider;
