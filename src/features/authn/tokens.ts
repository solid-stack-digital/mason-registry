import { ValueToken } from "@solid-stack/di";
import type { AuthnConfig } from "./domain/AuthnConfig.js";

export class AuthnConfigToken extends ValueToken<AuthnConfig> {}
