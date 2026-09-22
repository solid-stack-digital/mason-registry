import { describe, expect, it } from "vitest";
import { Duration } from "../Duration.js";

describe("Duration Value Object", () => {
	it("should instantiate with millis and expose readonly millis property", () => {
		const duration = new Duration(15000);
		expect(duration.millis).toBe(15000);
	});

	describe("Static Factories", () => {
		it("creates from millis", () => {
			expect(Duration.fromMillis(500).millis).toBe(500);
		});

		it("creates from seconds", () => {
			expect(Duration.fromSeconds(10).millis).toBe(10000);
		});

		it("creates from minutes", () => {
			expect(Duration.fromMinutes(5).millis).toBe(300000);
		});

		it("creates from hours", () => {
			expect(Duration.fromHours(2).millis).toBe(7200000);
		});

		it("creates from days", () => {
			expect(Duration.fromDays(1).millis).toBe(86400000);
		});
	});

	describe("Conversions", () => {
		const d = Duration.fromMinutes(90);

		it("converts to millis, seconds, minutes, hours, days", () => {
			expect(d.toMillis()).toBe(5400000);
			expect(d.toSeconds()).toBe(5400);
			expect(d.toMinutes()).toBe(90);
			expect(d.toHours()).toBe(1);
			expect(d.toDays()).toBe(0);
		});
	});

	describe("Operations", () => {
		it("adds and subtracts durations", () => {
			const d1 = Duration.fromMinutes(10);
			const d2 = Duration.fromMinutes(5);

			expect(d1.plus(d2).toMinutes()).toBe(15);
			expect(d1.minus(d2).toMinutes()).toBe(5);
		});

		it("checks equality", () => {
			expect(Duration.fromMinutes(1).equals(Duration.fromSeconds(60))).toBe(
				true,
			);
			expect(Duration.fromMinutes(1).equals(Duration.fromSeconds(30))).toBe(
				false,
			);
		});
	});
});
