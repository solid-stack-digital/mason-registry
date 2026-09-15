import type { Container } from "@solid-stack/di";
import { IIdGenerator } from "./ports/IIdGenerator.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";

export const diProvider = (c: Container): void => {
  c.provide(IIdGenerator, CryptoIdGenerator);
};

export default diProvider;
