import { Duration } from "@/shared/time/domain/Duration.js";
import type { Time } from "@/shared/time/domain/Time.js";

export interface OtpConfig {
	retryInterval: Time | Duration;
	otpTtl: Time | Duration;
	maxAttempts: number;
}

export const DEFAULT_OTP_CONFIG: OtpConfig = {
	retryInterval: Duration.fromSeconds(30),
	otpTtl: Duration.fromMinutes(5),
	maxAttempts: 3,
};

export function toMillis(timeOrDuration: Time | Duration | number): number {
	if (typeof timeOrDuration === "number") {
		return timeOrDuration;
	}
	return timeOrDuration.millis;
}
