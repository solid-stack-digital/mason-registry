import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Clock } from "@/shared/time/Clock.js";
import { Time } from "@/shared/time/domain/Time.js";
import type { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import type { RefreshToken } from "../domain/RefreshToken.js";

@MakeInjectable
export class MemoryRefreshTokenRepo implements IRefreshTokenRepo {
	public static deps = {
		clock: Clock,
	};
	private tokens: RefreshToken[] = [];

	constructor(public deps: DepsType<typeof MemoryRefreshTokenRepo.deps>) {}

	private cloneToken(token: RefreshToken): RefreshToken {
		return {
			...token,
			expiresAt: new Time(token.expiresAt.millis),
			createdAt: new Time(token.createdAt.millis),
			updatedAt: new Time(token.updatedAt.millis),
		};
	}

	async save(token: RefreshToken): Promise<void> {
		this.tokens.push(this.cloneToken(token));
	}

	async update(token: RefreshToken): Promise<void> {
		const index = this.tokens.findIndex((t) => t.id === token.id);
		if (index !== -1) {
			this.tokens[index] = this.cloneToken(token);
		} else {
			this.tokens.push(this.cloneToken(token));
		}
	}

	async findByToken(token: string): Promise<RefreshToken | null> {
		const found = this.tokens.find((t) => t.token === token);
		if (!found) return null;
		return this.cloneToken(found);
	}

	async findById(id: string): Promise<RefreshToken | null> {
		const found = this.tokens.find((t) => t.id === id);
		if (!found) return null;
		return this.cloneToken(found);
	}

	async findActiveByCredentialAndDevice(
		credentialId: string,
		clientDeviceId: string,
	): Promise<RefreshToken | null> {
		const matches = this.tokens.filter(
			(t) =>
				t.credentialId === credentialId &&
				t.clientDeviceId === clientDeviceId &&
				!t.isRevoked,
		);
		if (matches.length === 0 || !matches[0]) return null;

		matches.sort((a, b) => b.createdAt.millis - a.createdAt.millis);
		const latest = matches[0];
		if (!latest) return null;
		return this.cloneToken(latest);
	}

	async revokeAllByCredentialId(credentialId: string): Promise<void> {
		const now = this.deps.clock.now();
		for (const t of this.tokens) {
			if (t.credentialId === credentialId) {
				t.isRevoked = true;
				t.updatedAt = now;
			}
		}
	}

	async revokeFamily(familyId: string): Promise<void> {
		const now = this.deps.clock.now();
		for (const t of this.tokens) {
			if (t.familyId === familyId) {
				t.isRevoked = true;
				t.updatedAt = now;
			}
		}
	}

	async revokeByToken(token: string): Promise<void> {
		const now = this.deps.clock.now();
		for (const t of this.tokens) {
			if (t.token === token) {
				t.isRevoked = true;
				t.updatedAt = now;
			}
		}
	}

	async deleteByToken(token: string): Promise<void> {
		this.tokens = this.tokens.filter((t) => t.token !== token);
	}

	clear(): void {
		this.tokens = [];
	}
}
