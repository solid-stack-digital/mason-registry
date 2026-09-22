/**
 * Identifier Generator Port.
 * Injected into use cases for generating unique IDs (e.g. UUIDv4).
 */
export abstract class IIdGenerator {
	abstract generate(): string;
}
