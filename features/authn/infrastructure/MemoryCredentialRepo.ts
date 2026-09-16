import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { type Credential } from "../domain/Credential.js";
import { Time } from "@/shared/time/domain/Time.js";

@MakeInjectable
export class MemoryCredentialRepo implements ICredentialRepo {
  public static deps = {};
  private credentials: Credential[] = [];

  constructor(public deps: DepsType<typeof MemoryCredentialRepo.deps>) {}

  private cloneCredential(credential: Credential): Credential {
    return {
      ...credential,
      createdAt: new Time(credential.createdAt.millis),
      updatedAt: new Time(credential.updatedAt.millis),
    };
  }

  async save(credential: Credential): Promise<void> {
    this.credentials.push(this.cloneCredential(credential));
  }

  async update(credential: Credential): Promise<void> {
    const index = this.credentials.findIndex((c) => c.id === credential.id);
    if (index !== -1) {
      this.credentials[index] = this.cloneCredential(credential);
    } else {
      this.credentials.push(this.cloneCredential(credential));
    }
  }

  async findById(id: string): Promise<Credential | null> {
    const found = this.credentials.find((c) => c.id === id);
    if (!found) return null;
    return this.cloneCredential(found);
  }

  async findByEmail(email: string): Promise<Credential | null> {
    const normalized = email.toLowerCase();
    const found = this.credentials.find(
      (c) => c.email.toLowerCase() === normalized
    );
    if (!found) return null;
    return this.cloneCredential(found);
  }

  async delete(id: string): Promise<void> {
    this.credentials = this.credentials.filter((c) => c.id !== id);
  }

  clear(): void {
    this.credentials = [];
  }
}
