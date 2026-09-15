import type { Container } from "@solid-stack/di";
import { IJwtEngine } from "./ports/IJwtEngine.js";
import { HmacJwtEngine } from "./infrastructure/HmacJwtEngine.js";

export const diProvider = (c: Container): void => {
  c.provide(IJwtEngine, HmacJwtEngine);
};

export default diProvider;
