/**
 * Strongly typed Identifier value object / brand helper.
 */
export type Brand<K, T> = K & { readonly __brand: T };

export type Id<T extends string = string> = Brand<string, T>;

export const brandId = <T extends string = string>(raw: string): Id<T> => {
	if (!raw || typeof raw !== "string" || !raw.trim()) {
		throw new Error("Identifier must be a non-empty string");
	}
	return raw.trim() as Id<T>;
};
