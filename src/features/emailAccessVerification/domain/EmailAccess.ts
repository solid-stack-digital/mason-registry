import type { Time } from "@/shared/time/domain/Time.js";

export interface EmailAccess {
	id: string;
	jti: string;
	email: string;
	purpose: string;
	isUsed: boolean;
	isInvalidated: boolean;
	expiresAt: Time;
	createdAt: Time;
	updatedAt: Time;
}

export interface DecodedEmailAccessPayload {
	jti: string;
	email: string;
	purpose: string;
	exp?: number | undefined;
	iat?: number | undefined;
}
