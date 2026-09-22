export abstract class IHashEngine {
	abstract hash(plain: string): Promise<string>;
	abstract compare(hashed: string, plain: string): Promise<boolean>;
	abstract verify(plain: string, hashed: string): Promise<boolean>;
}
