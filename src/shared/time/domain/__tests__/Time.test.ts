import { describe, expect, it } from "vitest";
import { Duration } from "../Duration.js";
import { Time } from "../Time.js";

describe("Time Value Object", () => {
	const baseMillis = 1700000000000; // 2023-11-14T22:13:20.000Z

	describe("Instantiation & Basic Properties", () => {
		it("should instantiate with millis and expose readonly millis property", () => {
			const time = new Time(baseMillis);
			expect(time.millis).toBe(baseMillis);
		});

		it("should handle the Unix epoch timestamp (0 ms)", () => {
			const epoch = new Time(0);
			expect(epoch.millis).toBe(0);
		});
	});

	describe("Time Component Extractors", () => {
		it("should correctly extract getMilliseconds() across boundaries", () => {
			expect(new Time(1000).getMilliseconds()).toBe(0);
			expect(new Time(1500).getMilliseconds()).toBe(500);
			expect(new Time(1999).getMilliseconds()).toBe(999);
			expect(new Time(0).getMilliseconds()).toBe(0);
		});

		it("should correctly extract getSeconds() across boundaries", () => {
			expect(new Time(0).getSeconds()).toBe(0);
			expect(new Time(45000).getSeconds()).toBe(45);
			expect(new Time(59999).getSeconds()).toBe(59);
			expect(new Time(60000).getSeconds()).toBe(0);
			expect(new Time(65432).getSeconds()).toBe(5);
		});

		it("should correctly extract getMinutes() across boundaries", () => {
			expect(new Time(0).getMinutes()).toBe(0);
			expect(new Time(59000).getMinutes()).toBe(0);
			expect(new Time(60000).getMinutes()).toBe(1);
			expect(new Time(3540000).getMinutes()).toBe(59);
			expect(new Time(3600000).getMinutes()).toBe(0);
			expect(new Time(3720000).getMinutes()).toBe(2);
		});

		it("should correctly extract getHours() across boundaries", () => {
			expect(new Time(0).getHours()).toBe(0);
			expect(new Time(3600000).getHours()).toBe(1);
			expect(new Time(82800000).getHours()).toBe(23);
			expect(new Time(86400000).getHours()).toBe(0);
			expect(new Time(90000000).getHours()).toBe(1);
		});

		it("should accurately extract all components for a specific known UTC timestamp", () => {
			// 2024-02-29T15:45:30.789Z -> pure epoch millis
			const millis = 1709221530789;
			const time = new Time(millis);

			expect(time.getHours()).toBe(15);
			expect(time.getMinutes()).toBe(45);
			expect(time.getSeconds()).toBe(30);
			expect(time.getMilliseconds()).toBe(789);
		});
	});

	describe("Day of Week (getDayOfWeek)", () => {
		it("should identify Jan 1, 1970 as Thursday (4)", () => {
			const epoch = new Time(0);
			expect(epoch.getDayOfWeek()).toBe(4);
		});

		it("should correctly calculate all 7 days of the week in sequence", () => {
			const sundayMillis = 3 * 86400000;
			for (let i = 0; i < 7; i++) {
				const time = new Time(sundayMillis + i * 86400000);
				expect(time.getDayOfWeek()).toBe(i);
			}
		});

		it("should correctly identify day of week for a known future leap day", () => {
			// 2024-02-29T12:00:00.000Z -> Thursday (4)
			const leapDay = new Time(1709208000000);
			expect(leapDay.getDayOfWeek()).toBe(4);
		});
	});

	describe("Comparisons & Arithmetic", () => {
		it("compares before, after, equal", () => {
			const t1 = new Time(1000);
			const t2 = new Time(2000);
			expect(t1.isBefore(t2)).toBe(true);
			expect(t2.isAfter(t1)).toBe(true);
			expect(t1.isEqual(new Time(1000))).toBe(true);
		});

		it("supports plus and minus with Duration", () => {
			const t = new Time(baseMillis);
			const dur = Duration.fromMinutes(10);
			expect(t.plus(dur).millis).toBe(baseMillis + 600000);
			expect(t.minus(dur).millis).toBe(baseMillis - 600000);
			expect(t.plus(dur).minus(dur).isEqual(t)).toBe(true);
		});

		it("supports distance calculation returning Duration", () => {
			const t1 = new Time(5000);
			const t2 = new Time(3000);
			const d = t1.distanceFrom(t2);
			expect(d.millis).toBe(2000);
		});

		it("guarantees immutability", () => {
			const original = new Time(1000);
			const modified = original.plus(Duration.fromSeconds(5));
			expect(modified).not.toBe(original);
			expect(original.millis).toBe(1000);
			expect(modified.millis).toBe(6000);
		});
	});
});
