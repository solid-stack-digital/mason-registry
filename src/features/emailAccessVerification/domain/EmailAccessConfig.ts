import { Duration } from "@/shared/time/domain/Duration.js";
import type { Time } from "@/shared/time/domain/Time.js";

export interface EmailAccessConfig {
	jwtTtl: Time | Duration | number;
}

export const DEFAULT_EMAIL_ACCESS_CONFIG: EmailAccessConfig = {
	jwtTtl: Duration.fromMinutes(15),
};

export function toDuration(value: Time | Duration | number): Duration {
	if (typeof value === "number") {
		return Duration.fromMillis(value);
	}
	if (value instanceof Duration) {
		return value;
	}
	return Duration.fromMillis(value.millis);
}
