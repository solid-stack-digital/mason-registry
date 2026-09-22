import type { Credential } from "./Credential.js";

export abstract class ICredentialRepo {
	abstract save(credential: Credential): Promise<void>;
	abstract update(credential: Credential): Promise<void>;
	abstract findById(id: string): Promise<Credential | null>;
	abstract findByEmail(email: string): Promise<Credential | null>;
	abstract delete(id: string): Promise<void>;
}
