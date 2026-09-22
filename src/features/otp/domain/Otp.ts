import type { Time } from "@/shared/time/domain/Time.js";

export interface Otp {
	id: string;
	recipientId: string;
	recipientEmail: string;
	purpose: string;
	otpCode: string;
	attempts: number;
	isUsed: boolean;
	expiresAt: Time;
	createdAt: Time;
	updatedAt: Time;
}
