import type { RefreshToken } from "./RefreshToken.js";

export abstract class IRefreshTokenRepo {
  abstract save(token: RefreshToken): Promise<void>;
  abstract update(token: RefreshToken): Promise<void>;
  abstract findByToken(token: string): Promise<RefreshToken | null>;
  abstract findById(id: string): Promise<RefreshToken | null>;
  abstract findActiveByCredentialAndDevice(
    credentialId: string,
    clientDeviceId: string,
  ): Promise<RefreshToken | null>;
  abstract revokeAllByCredentialId(credentialId: string): Promise<void>;
  abstract revokeFamily(familyId: string): Promise<void>;
  abstract revokeByToken(token: string): Promise<void>;
  abstract deleteByToken(token: string): Promise<void>;
}
