import type { Container } from "@solid-stack/di";
import { IHashEngine } from "./ports/IHashEngine.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";

export const diProvider = (c: Container): void => {
  c.provide(IHashEngine, ScryptHashEngine);
};

export default diProvider;
