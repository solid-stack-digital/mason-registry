export interface ConsumeEmailAccessTokenPayload {
	token: string;
	purpose: string;
	email: string;
}

/**
 * Domain port for consuming email access verification tokens.
 * Following Clean Architecture boundaries, authn defines its own local contract
 * of what it requires from the email access verification feature.
 */
export abstract class IEAVGateway {
	abstract consumeEmailAccessToken(
		payload: ConsumeEmailAccessTokenPayload,
	): Promise<boolean>;
}
