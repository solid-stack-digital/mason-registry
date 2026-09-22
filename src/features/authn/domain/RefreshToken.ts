import type { Time } from "@/shared/time/domain/Time.js";

export interface RefreshToken {
	id: string;
	credentialId: string;
	clientDeviceId: string;
	token: string;
	isRevoked: boolean;
	familyId?: string | undefined;
	expiresAt: Time;
	createdAt: Time;
	updatedAt: Time;
}
