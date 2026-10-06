import { ValueToken } from "@solid-stack/di";

export interface AuthnConfig {
	/** Refresh token lifetime in milliseconds. */
	refreshTokenTtl: number;
	/** Access token lifetime in milliseconds. */
	accessTokenTtl: number;
}

export class AuthnConfigToken extends ValueToken<AuthnConfig> {}
