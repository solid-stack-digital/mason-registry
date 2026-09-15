import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IIdGenerator } from "./ports/IIdGenerator.js";

@MakeInjectable
export class Uuid {
  public static deps = { idGenerator: IIdGenerator };
  constructor(public readonly deps: DepsType<typeof Uuid.deps>) {}

  generate(): string {
    return this.deps.idGenerator.generate();
  }
}
