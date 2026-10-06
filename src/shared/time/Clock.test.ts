import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ITimeEngine } from "@/shared/time/ports/ITimeEngine.js";
import { getTimeTestContainer } from "./__tests__/utils/getTimeTestContainer.js";
import { Clock } from "./Clock.js";
import { Duration } from "./domain/Duration.js";
import { StubClock, StubTimeEngine } from "./infrastructure/StubTimeEngine.js";

describe("Clock", () => {
	let container: Container;
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		container = getTimeTestContainer();
		// Explicit test doubles; runtime providers keep actual or in-memory implementations.
		container.provide(ITimeEngine, StubTimeEngine);
	});
	afterEach(() => vi.unstubAllEnvs());
	it("provides deterministic current time with StubTimeEngine", () => {
		const fixedMillis = 1700000000000;
		const stub = container.resolve(StubTimeEngine);
		stub.setMillis(fixedMillis);
		const clock = container.resolve(Clock);

		const now = clock.now();
		expect(now.millis).toBe(fixedMillis);

		stub.advance(1000);
		expect(clock.now().millis).toBe(fixedMillis + 1000);
	});

	it.each(["isolated", "integrated"])(
		"uses actual system time by default in %s mode",
		(mode) => {
			vi.stubEnv("INFRA_MODE", mode);
			const clock = getTimeTestContainer().resolve(Clock);
			const before = Date.now();
			const now = clock.now().millis;
			expect(now).toBeGreaterThanOrEqual(before);
			expect(now).toBeLessThanOrEqual(Date.now());
		},
	);

	it("parses duration strings correctly", () => {
		const clock = container.resolve(Clock);

		expect(clock.duration("500ms").millis).toBe(500);
		expect(clock.duration("10s").millis).toBe(10000);
		expect(clock.duration("5m").millis).toBe(300000);
		expect(clock.duration("1h").millis).toBe(3600000);
		expect(clock.duration("2d").millis).toBe(172800000);
		expect(clock.duration(1234).millis).toBe(1234);
	});

	it("converts to and from ISO strings", () => {
		const clock = container.resolve(Clock);

		const iso = "2024-01-15T12:00:00.000Z";
		const time = clock.fromIso(iso);
		expect(time.millis).toBe(Date.parse(iso));
		expect(clock.toIso(time)).toBe(iso);
	});

	it("converts to and from civil dates", () => {
		const clock = container.resolve(Clock);

		const time = clock.fromCivilDate(2025, 6, 20);
		const civil = clock.toCivilDate(time);

		expect(civil).toEqual({ year: 2025, month: 6, day: 20 });
	});

	it("throws on invalid duration string", () => {
		const clock = container.resolve(Clock);

		expect(() => clock.duration("invalid")).toThrow("Invalid duration string");
	});

	describe.each([Clock, StubClock])(
		"%s numeric duration factories",
		(ClockType) => {
			it.each([
				["durationMillis", 1],
				["durationSeconds", 1000],
				["durationMinutes", 60000],
				["durationHours", 3600000],
				["durationDays", 86400000],
			] as const)(
				"%s returns a Duration in the requested unit",
				(method, multiplier) => {
					const clock = container.resolve(ClockType);
					for (const value of [0, 2, 1.5, -2]) {
						const result = clock[method](value);
						expect(result).toBeInstanceOf(Duration);
						expect(result.millis).toBe(value * multiplier);
					}
				},
			);
		},
	);
});
