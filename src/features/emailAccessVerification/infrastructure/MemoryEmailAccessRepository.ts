import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Time } from "@/shared/time/domain/Time.js";
import type { EmailAccess } from "../domain/EmailAccess.js";
import type { IEmailAccessRepository } from "../domain/IEmailAccessRepository.js";

@MakeInjectable
export class MemoryEmailAccessRepository implements IEmailAccessRepository {
	public static deps = {};
	private items: EmailAccess[] = [];

	constructor(public deps: DepsType<typeof MemoryEmailAccessRepository.deps>) {}

	private cloneAccess(item: EmailAccess): EmailAccess {
		return {
			...item,
			createdAt: new Time(item.createdAt.millis),
			updatedAt: new Time(item.updatedAt.millis),
			expiresAt: new Time(item.expiresAt.millis),
		};
	}

	async save(emailAccess: EmailAccess): Promise<void> {
		this.items.push(this.cloneAccess(emailAccess));
	}

	async findByJti(jti: string): Promise<EmailAccess | null> {
		const found = this.items.find((item) => item.jti === jti);
		return found ? this.cloneAccess(found) : null;
	}

	async findLatestByEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<EmailAccess | null> {
		const matching = this.items
			.filter((item) => item.email === email && item.purpose === purpose)
			.reverse()
			.sort((a, b) => b.createdAt.millis - a.createdAt.millis);

		const latest = matching[0];
		return latest ? this.cloneAccess(latest) : null;
	}

	async findActiveByEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<EmailAccess[]> {
		return this.items
			.filter(
				(item) =>
					item.email === email &&
					item.purpose === purpose &&
					!item.isUsed &&
					!item.isInvalidated,
			)
			.map((item) => this.cloneAccess(item));
	}

	async invalidateAllForEmailAndPurpose(
		email: string,
		purpose: string,
	): Promise<void> {
		for (const item of this.items) {
			if (item.email === email && item.purpose === purpose) {
				item.isInvalidated = true;
			}
		}
	}

	async update(emailAccess: EmailAccess): Promise<void> {
		const index = this.items.findIndex((item) => item.id === emailAccess.id);
		if (index !== -1) {
			this.items[index] = this.cloneAccess(emailAccess);
		}
	}

	async delete(id: string): Promise<void> {
		this.items = this.items.filter((item) => item.id !== id);
	}

	// Snapshot for local inspection
	getAll(): EmailAccess[] {
		return this.items.map((item) => this.cloneAccess(item));
	}

	clear(): void {
		this.items = [];
	}
}
