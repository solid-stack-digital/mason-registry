import { randomUUID } from "node:crypto";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IIdGenerator } from "../ports/IIdGenerator.js";

/**
 * Production ID generator producing UUIDv4 identifiers using node:crypto
 */
@MakeInjectable
export class CryptoIdGenerator implements IIdGenerator {
  public static deps = {};

  constructor(public deps: DepsType<typeof CryptoIdGenerator.deps>) {}

  generate(): string {
    return randomUUID();
  }
}
