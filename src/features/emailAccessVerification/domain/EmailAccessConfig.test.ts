import { describe, expect, it } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import {
	DEFAULT_EMAIL_ACCESS_CONFIG,
	toDuration,
} from "./EmailAccessConfig.js";

describe("EmailAccessConfig Domain", () => {
	it("DEFAULT_EMAIL_ACCESS_CONFIG should have 15 minutes jwtTtl", () => {
		expect(DEFAULT_EMAIL_ACCESS_CONFIG.jwtTtl).toBeDefined();
		const duration = toDuration(DEFAULT_EMAIL_ACCESS_CONFIG.jwtTtl);
		expect(duration.millis).toBe(15 * 60 * 1000);
	});

	it("toDuration should convert number, Time, and Duration properly", () => {
		expect(toDuration(60000).millis).toBe(60000);
		expect(toDuration(new Time(120000)).millis).toBe(120000);
		expect(toDuration(Duration.fromSeconds(30)).millis).toBe(30000);
	});
});
