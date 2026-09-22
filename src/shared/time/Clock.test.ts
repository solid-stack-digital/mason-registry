import { describe, expect, it } from "vitest";
import { Clock } from "./Clock.js";
import { StubTimeEngine } from "./infrastructure/StubTimeEngine.js";

describe("Clock", () => {
	it("provides deterministic current time with StubTimeEngine", () => {
		const fixedMillis = 1700000000000;
		const stub = new StubTimeEngine({}, fixedMillis);
		const clock = new Clock({ timeEngine: stub });

		const now = clock.now();
		expect(now.millis).toBe(fixedMillis);

		stub.advance(1000);
		expect(clock.now().millis).toBe(fixedMillis + 1000);
	});

	it("parses duration strings correctly", () => {
		const stub = new StubTimeEngine({});
		const clock = new Clock({ timeEngine: stub });

		expect(clock.duration("500ms").millis).toBe(500);
		expect(clock.duration("10s").millis).toBe(10000);
		expect(clock.duration("5m").millis).toBe(300000);
		expect(clock.duration("1h").millis).toBe(3600000);
		expect(clock.duration("2d").millis).toBe(172800000);
		expect(clock.duration(1234).millis).toBe(1234);
	});

	it("converts to and from ISO strings", () => {
		const stub = new StubTimeEngine({});
		const clock = new Clock({ timeEngine: stub });

		const iso = "2024-01-15T12:00:00.000Z";
		const time = clock.fromIso(iso);
		expect(time.millis).toBe(Date.parse(iso));
		expect(clock.toIso(time)).toBe(iso);
	});

	it("converts to and from civil dates", () => {
		const stub = new StubTimeEngine({});
		const clock = new Clock({ timeEngine: stub });

		const time = clock.fromCivilDate(2025, 6, 20);
		const civil = clock.toCivilDate(time);

		expect(civil).toEqual({ year: 2025, month: 6, day: 20 });
	});

	it("throws on invalid duration string", () => {
		const stub = new StubTimeEngine({});
		const clock = new Clock({ timeEngine: stub });

		expect(() => clock.duration("invalid")).toThrow("Invalid duration string");
	});
});
