import { describe, expect, it } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import { DEFAULT_OTP_CONFIG, toMillis } from "./OtpConfig.js";

describe("OtpConfig Domain Configuration", () => {
	it("DEFAULT_OTP_CONFIG should provide correct defaults", () => {
		expect(DEFAULT_OTP_CONFIG.retryInterval.millis).toBe(30_000);
		expect(DEFAULT_OTP_CONFIG.otpTtl.millis).toBe(300_000);
		expect(DEFAULT_OTP_CONFIG.maxAttempts).toBe(3);
	});

	it("toMillis should convert Time, Duration, and number to milliseconds", () => {
		const duration = Duration.fromSeconds(45);
		const time = new Time(15_000);
		const rawNumber = 20_000;

		expect(toMillis(duration)).toBe(45_000);
		expect(toMillis(time)).toBe(15_000);
		expect(toMillis(rawNumber)).toBe(20_000);
	});
});
