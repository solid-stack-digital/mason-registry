import type { RefreshToken } from "./RefreshToken.js";

export abstract class ISessionRepo {
	abstract save(token: RefreshToken): Promise<void>;
	abstract update(token: RefreshToken): Promise<void>;
	abstract findByToken(token: string): Promise<RefreshToken | null>;
	abstract findById(id: string): Promise<RefreshToken | null>;
	abstract findByJti(jti: string): Promise<RefreshToken | null>;
	abstract findActiveByCredentialAndDevice(
		credentialId: string,
		clientDeviceId: string,
	): Promise<RefreshToken | null>;
	abstract deleteByToken(token: string): Promise<void>;
	abstract deleteById(id: string): Promise<void>;
	abstract deleteByDeviceAndJti(
		clientDeviceId: string,
		jti: string,
	): Promise<void>;
	abstract deleteByCredentialAndDevice(
		credentialId: string,
		clientDeviceId: string,
	): Promise<void>;
	abstract deleteAllByCredentialId(credentialId: string): Promise<void>;
	abstract deleteAllByCredentialExceptDevice(
		credentialId: string,
		clientDeviceId: string,
	): Promise<void>;
	abstract revokeAllByCredentialId(credentialId: string): Promise<void>;
	abstract revokeFamily(familyId: string): Promise<void>;
	abstract revokeByToken(token: string): Promise<void>;
}
