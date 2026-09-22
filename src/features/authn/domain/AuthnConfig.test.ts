import { describe, expect, it } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import { DEFAULT_AUTHN_CONFIG, toDuration } from "./AuthnConfig.js";

describe("AuthnConfig", () => {
	it("has default values of 7 days for refreshTokenTtl and 5 minutes for accessTokenTtl", () => {
		expect(toDuration(DEFAULT_AUTHN_CONFIG.refreshTokenTtl).toDays()).toBe(7);
		expect(toDuration(DEFAULT_AUTHN_CONFIG.accessTokenTtl).toMinutes()).toBe(5);
	});

	it("toDuration correctly converts numbers, Durations, and Times", () => {
		expect(toDuration(5000).millis).toBe(5000);
		expect(toDuration(Duration.fromMinutes(10)).toMinutes()).toBe(10);
		expect(toDuration(new Time(15000)).millis).toBe(15000);
	});
});
