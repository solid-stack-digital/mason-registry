import { ValueToken } from "@solid-stack/di";

export interface OtpConfig {
	/** Retry cooldown in milliseconds. */
	retryInterval: number;
	/** OTP lifetime in milliseconds. */
	otpTtl: number;
	maxAttempts: number;
}

export class OtpConfigToken extends ValueToken<OtpConfig> {}
