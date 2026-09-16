import { MakeInjectable, ValueToken, type DepsType } from "@solid-stack/di";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import { type RefreshToken } from "../domain/RefreshToken.js";
import { Clock } from "@/shared/time/Clock.js";
import { Time } from "@/shared/time/domain/Time.js";

export class InitialRefreshTokens extends ValueToken<RefreshToken[]> {}

@MakeInjectable
export class StubRefreshTokenRepo implements IRefreshTokenRepo {
  private tokens: RefreshToken[] = [];
  private errorToThrow: Error | null = null;

  public static deps = {
    initialRefreshTokens: InitialRefreshTokens,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof StubRefreshTokenRepo.deps>) {
    this.tokens = this.deps.initialRefreshTokens
      ? this.deps.initialRefreshTokens.map((t) => this.cloneToken(t))
      : [];
  }

  private cloneToken(token: RefreshToken): RefreshToken {
    return {
      ...token,
      expiresAt:
        token.expiresAt instanceof Time
          ? new Time(token.expiresAt.millis)
          : token.expiresAt,
      createdAt:
        token.createdAt instanceof Time
          ? new Time(token.createdAt.millis)
          : token.createdAt,
      updatedAt:
        token.updatedAt instanceof Time
          ? new Time(token.updatedAt.millis)
          : token.updatedAt,
    };
  }

  public setTokens(tokens: RefreshToken[]): void {
    this.tokens = tokens.map((t) => this.cloneToken(t));
  }

  public addToken(token: RefreshToken): void {
    this.tokens.push(this.cloneToken(token));
  }

  public getTokens(): RefreshToken[] {
    return this.tokens.map((t) => this.cloneToken(t));
  }

  public clear(): void {
    this.tokens = [];
    this.errorToThrow = null;
  }

  public setError(error: Error | null): void {
    this.errorToThrow = error;
  }

  async save(token: RefreshToken): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    this.tokens.push(this.cloneToken(token));
  }

  async update(token: RefreshToken): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    const index = this.tokens.findIndex((t) => t.id === token.id);
    if (index !== -1) {
      this.tokens[index] = this.cloneToken(token);
    } else {
      this.tokens.push(this.cloneToken(token));
    }
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    if (this.errorToThrow) throw this.errorToThrow;
    const found = this.tokens.find((t) => t.token === token);
    if (!found) return null;
    return this.cloneToken(found);
  }

  async findById(id: string): Promise<RefreshToken | null> {
    if (this.errorToThrow) throw this.errorToThrow;
    const found = this.tokens.find((t) => t.id === id);
    if (!found) return null;
    return this.cloneToken(found);
  }

  async findActiveByCredentialAndDevice(
    credentialId: string,
    clientDeviceId: string
  ): Promise<RefreshToken | null> {
    if (this.errorToThrow) throw this.errorToThrow;
    const matches = this.tokens.filter(
      (t) =>
        t.credentialId === credentialId &&
        t.clientDeviceId === clientDeviceId &&
        !t.isRevoked
    );
    if (matches.length === 0 || !matches[0]) return null;

    matches.sort((a, b) => b.createdAt.millis - a.createdAt.millis);
    const latest = matches[0];
    if (!latest) return null;
    return this.cloneToken(latest);
  }

  async revokeAllByCredentialId(credentialId: string): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    const now = this.deps.clock.now();
    for (const t of this.tokens) {
      if (t.credentialId === credentialId) {
        t.isRevoked = true;
        t.updatedAt = now;
      }
    }
  }

  async revokeFamily(familyId: string): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    const now = this.deps.clock.now();
    for (const t of this.tokens) {
      if (t.familyId === familyId) {
        t.isRevoked = true;
        t.updatedAt = now;
      }
    }
  }

  async revokeByToken(token: string): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    const now = this.deps.clock.now();
    for (const t of this.tokens) {
      if (t.token === token) {
        t.isRevoked = true;
        t.updatedAt = now;
      }
    }
  }

  async deleteByToken(token: string): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    this.tokens = this.tokens.filter((t) => t.token !== token);
  }
}
