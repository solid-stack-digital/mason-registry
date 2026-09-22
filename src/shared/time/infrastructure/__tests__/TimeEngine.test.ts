import { describe, expect, it } from "vitest";
import { Clock } from "../../Clock.js";
import { Duration } from "../../domain/Duration.js";
import { Time } from "../../domain/Time.js";
import { StubClock, StubTimeEngine } from "../StubTimeEngine.js";
import { SystemTimeEngine } from "../SystemTimeEngine.js";

describe("Time Infrastructure & Clock", () => {
	const baseMillis = 1700000000000; // 2023-11-14T22:13:20.000Z
	const expectedIso = "2023-11-14T22:13:20.000Z";

	describe("SystemTimeEngine", () => {
		it("returns current timestamp within execution window", () => {
			const engine = new SystemTimeEngine({});
			const before = Date.now();
			const now = engine.millisNow();
			const after = Date.now();

			expect(now).toBeGreaterThanOrEqual(before);
			expect(now).toBeLessThanOrEqual(after);
		});

		it("transforms millis to ISO string", () => {
			const engine = new SystemTimeEngine({});
			expect(engine.millisToIso(baseMillis)).toBe(expectedIso);
		});

		it("transforms ISO string to millis", () => {
			const engine = new SystemTimeEngine({});
			expect(engine.isoToMillis(expectedIso)).toBe(baseMillis);
		});

		it("rejects invalid millis in millisToIso", () => {
			const engine = new SystemTimeEngine({});
			expect(() => engine.millisToIso(NaN)).toThrow("Invalid millis");
			expect(() => engine.millisToIso("invalid" as unknown as number)).toThrow(
				"Invalid millis",
			);
		});

		it("rejects invalid ISO strings", () => {
			const engine = new SystemTimeEngine({});
			expect(() => engine.isoToMillis("not-a-date")).toThrow(
				"Invalid ISO date string",
			);
			expect(() => engine.isoToMillis("")).toThrow("Invalid ISO date string");
			expect(() => engine.isoToMillis(null as unknown as string)).toThrow(
				"Invalid ISO date string",
			);
		});

		describe("Civil Date Calculations", () => {
			it("computes exact civil date for Unix epoch (1970-01-01)", () => {
				const engine = new SystemTimeEngine({});
				expect(engine.millisToCivilDate(0)).toEqual({
					year: 1970,
					month: 1,
					day: 1,
				});
				expect(engine.civilDateToMillis(1970, 1, 1)).toBe(0);
			});

			it("handles leap year 2000 (divisible by 400)", () => {
				const engine = new SystemTimeEngine({});
				// 2000-02-29T00:00:00.000Z -> 951782400000
				expect(engine.millisToCivilDate(951782400000)).toEqual({
					year: 2000,
					month: 2,
					day: 29,
				});
				expect(engine.civilDateToMillis(2000, 2, 29)).toBe(951782400000);
			});

			it("handles standard leap year 2024", () => {
				const engine = new SystemTimeEngine({});
				// 2024-02-28T00:00:00.000Z -> 1709078400000
				expect(engine.millisToCivilDate(1709078400000)).toEqual({
					year: 2024,
					month: 2,
					day: 28,
				});
				expect(engine.civilDateToMillis(2024, 2, 28)).toBe(1709078400000);

				// 2024-02-29T00:00:00.000Z -> 1709164800000
				expect(engine.millisToCivilDate(1709164800000)).toEqual({
					year: 2024,
					month: 2,
					day: 29,
				});
				expect(engine.civilDateToMillis(2024, 2, 29)).toBe(1709164800000);
			});

			it("rejects invalid civil dates", () => {
				const engine = new SystemTimeEngine({});
				expect(() => engine.civilDateToMillis(2024, 2, 30)).toThrow(
					"Invalid civil date",
				);
				expect(() => engine.civilDateToMillis(2023, 2, 29)).toThrow(
					"Invalid civil date",
				);
				expect(() => engine.civilDateToMillis(NaN, 1, 1)).toThrow(
					"Invalid civil date",
				);
			});
		});
	});

	describe("StubTimeEngine", () => {
		it("returns deterministic initial time", () => {
			const stub = new StubTimeEngine({}, 1600000000000);
			expect(stub.millisNow()).toBe(1600000000000);
		});

		it("allows advancing time via Duration or number millis", () => {
			const stub = new StubTimeEngine({}, 1000);
			stub.advance(500);
			expect(stub.millisNow()).toBe(1500);

			stub.advance(Duration.fromMinutes(1));
			expect(stub.millisNow()).toBe(61500);
		});

		it("allows setting time explicitly", () => {
			const stub = new StubTimeEngine({});
			stub.setTime(new Time(9999));
			expect(stub.millisNow()).toBe(9999);

			stub.setMillis(42);
			expect(stub.millisNow()).toBe(42);
		});

		it("transforms millis and civil dates correctly", () => {
			const stub = new StubTimeEngine({});
			expect(stub.millisToIso(baseMillis)).toBe(expectedIso);
			expect(stub.isoToMillis(expectedIso)).toBe(baseMillis);
			expect(stub.millisToCivilDate(0)).toEqual({
				year: 1970,
				month: 1,
				day: 1,
			});
			expect(stub.civilDateToMillis(1970, 1, 1)).toBe(0);
		});
	});

	describe("StubClock", () => {
		it("instantiates as Clock with deterministic initial time", () => {
			const stubClock = new StubClock({}, new Time(1600000000000));
			expect(stubClock.now()).toBeInstanceOf(Time);
			expect(stubClock.now().millis).toBe(1600000000000);
		});

		it("advances time and affects now()", () => {
			const stubClock = new StubClock({}, 1000);
			stubClock.advance(500);
			expect(stubClock.now().millis).toBe(1500);

			stubClock.advance(Duration.fromSeconds(10));
			expect(stubClock.now().millis).toBe(11500);
		});

		it("supports setTime and setMillis", () => {
			const stubClock = new StubClock({});
			stubClock.setTime(new Time(5555));
			expect(stubClock.now().millis).toBe(5555);

			stubClock.setMillis(7777);
			expect(stubClock.now().millis).toBe(7777);
		});
	});

	describe("Clock Service", () => {
		it("delegates now, toIso, fromIso, toCivilDate, fromCivilDate to timeEngine", () => {
			const stubEngine = new StubTimeEngine({}, baseMillis);
			const clock = new Clock({ timeEngine: stubEngine });

			expect(clock.now().millis).toBe(baseMillis);
			expect(clock.toIso(new Time(baseMillis))).toBe(expectedIso);
			expect(clock.fromIso(expectedIso).millis).toBe(baseMillis);
			expect(clock.toCivilDate(new Time(0))).toEqual({
				year: 1970,
				month: 1,
				day: 1,
			});
			expect(clock.fromCivilDate(1970, 1, 1).millis).toBe(0);
		});

		it("parses duration strings across units", () => {
			const clock = new Clock({ timeEngine: new StubTimeEngine({}) });

			expect(clock.duration("500ms").millis).toBe(500);
			expect(clock.duration("10s").millis).toBe(10000);
			expect(clock.duration("2.5s").millis).toBe(2500);
			expect(clock.duration("5m").millis).toBe(300000);
			expect(clock.duration("2h").millis).toBe(7200000);
			expect(clock.duration("1d").millis).toBe(86400000);
			expect(clock.duration("1.5 d").millis).toBe(129600000);
			expect(clock.duration("1w").millis).toBe(604800000);
			expect(clock.duration(1234).millis).toBe(1234);
		});

		it("throws on invalid duration input", () => {
			const clock = new Clock({ timeEngine: new StubTimeEngine({}) });

			expect(() => clock.duration("invalid")).toThrow(
				"Invalid duration string",
			);
			expect(() => clock.duration("100x")).toThrow("Invalid duration string");
			expect(() => clock.duration(null as unknown as number)).toThrow(
				"Invalid duration type",
			);
		});
	});
});
