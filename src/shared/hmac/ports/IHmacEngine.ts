export type HmacData = string;

export type HmacAlgorithm =
	| "sha256"
	| "sha384"
	| "sha512"
	| "sha1"
	| "sha224"
	| (string & {});

export type HmacEncoding = "hex" | "base64" | "base64url";

export interface HmacOptions {
	algorithm?: HmacAlgorithm;
	encoding?: HmacEncoding;
	secret: string;
}

export abstract class IHmacEngine {
	abstract sign(data: HmacData, options?: HmacOptions): string;

	abstract verify(
		data: HmacData,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean;
}
