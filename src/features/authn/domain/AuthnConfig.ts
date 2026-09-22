import { Duration } from "@/shared/time/domain/Duration.js";
import type { Time } from "@/shared/time/domain/Time.js";

export interface AuthnConfig {
	refreshTokenTtl: Time | Duration | number;
	accessTokenTtl: Time | Duration | number;
}

export const DEFAULT_AUTHN_CONFIG: AuthnConfig = {
	refreshTokenTtl: Duration.fromDays(7),
	accessTokenTtl: Duration.fromMinutes(5),
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
