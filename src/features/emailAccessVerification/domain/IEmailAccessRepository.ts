import type { EmailAccess } from "./EmailAccess.js";

export abstract class IEmailAccessRepository {
	abstract save(emailAccess: EmailAccess): Promise<void>;
	abstract findByJti(jti: string): Promise<EmailAccess | null>;
	abstract findLatestByEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<EmailAccess | null>;
	abstract findActiveByEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<EmailAccess[]>;
	abstract invalidateAllForEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<void>;
	abstract update(emailAccess: EmailAccess): Promise<void>;
	abstract delete(id: string): Promise<void>;
}
