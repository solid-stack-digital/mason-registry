import { MakeInjectable, ValueToken, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { type Credential } from "../domain/Credential.js";
import { Time } from "@/shared/time/domain/Time.js";

export class InitialCredentials extends ValueToken<Credential[]> {}

@MakeInjectable
export class StubCredentialRepo implements ICredentialRepo {
  private credentials: Credential[] = [];
  private errorToThrow: Error | null = null;

  public static deps = {
    initialCredentials: InitialCredentials,
  };

  constructor(public deps: DepsType<typeof StubCredentialRepo.deps>) {
    this.credentials = this.deps.initialCredentials
      ? this.deps.initialCredentials.map((c) => this.cloneCredential(c))
      : [];
  }

  private cloneCredential(credential: Credential): Credential {
    return {
      ...credential,
      createdAt:
        credential.createdAt instanceof Time
          ? new Time(credential.createdAt.millis)
          : credential.createdAt,
      updatedAt:
        credential.updatedAt instanceof Time
          ? new Time(credential.updatedAt.millis)
          : credential.updatedAt,
    };
  }

  public setCredentials(credentials: Credential[]): void {
    this.credentials = credentials.map((c) => this.cloneCredential(c));
  }

  public addCredential(credential: Credential): void {
    this.credentials.push(this.cloneCredential(credential));
  }

  public getCredentials(): Credential[] {
    return this.credentials.map((c) => this.cloneCredential(c));
  }

  public clear(): void {
    this.credentials = [];
    this.errorToThrow = null;
  }

  public setError(error: Error | null): void {
    this.errorToThrow = error;
  }

  async save(credential: Credential): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    this.credentials.push(this.cloneCredential(credential));
  }

  async update(credential: Credential): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    const index = this.credentials.findIndex((c) => c.id === credential.id);
    if (index !== -1) {
      this.credentials[index] = this.cloneCredential(credential);
    } else {
      this.credentials.push(this.cloneCredential(credential));
    }
  }

  async findById(id: string): Promise<Credential | null> {
    if (this.errorToThrow) throw this.errorToThrow;
    const found = this.credentials.find((c) => c.id === id);
    if (!found) return null;
    return this.cloneCredential(found);
  }

  async findByEmail(email: string): Promise<Credential | null> {
    if (this.errorToThrow) throw this.errorToThrow;
    const normalized = email.toLowerCase();
    const found = this.credentials.find(
      (c) => c.email.toLowerCase() === normalized
    );
    if (!found) return null;
    return this.cloneCredential(found);
  }

  async delete(id: string): Promise<void> {
    if (this.errorToThrow) throw this.errorToThrow;
    this.credentials = this.credentials.filter((c) => c.id !== id);
  }
}
