import type { BinaryLike } from "node:crypto";

export type HmacInput = BinaryLike;

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
}

export abstract class IHmacEngine {
	abstract sign(
		data: HmacInput,
		secret: HmacInput,
		options?: HmacOptions,
	): string;

	abstract verify(
		data: HmacInput,
		secret: HmacInput,
		expectedDigest: string,
		options?: HmacOptions,
	): boolean;

	abstract generateSecret(bytes?: number, encoding?: HmacEncoding): string;
}
