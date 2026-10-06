import { ValueToken } from "@solid-stack/di";

export interface EmailAccessConfig {
	/** Email access JWT lifetime in milliseconds. */
	jwtTtl: number;
}

export class EmailAccessConfigToken extends ValueToken<EmailAccessConfig> {}
