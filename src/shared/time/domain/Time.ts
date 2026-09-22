import { Duration } from "./Duration.js";

/**
 * Represents a point in time with millisecond precision.
 * Immutable Value Object.
 */
export class Time {
	public readonly millis: number; // Milliseconds since Unix epoch (January 1, 1970, 00:00:00 UTC)

	constructor(millis: number) {
		this.millis = millis;
	}

	// =========================================================================
	// Calendar and Component Accessors
	// =========================================================================

	getMilliseconds(): number {
		return this.millis % 1000;
	}

	getSeconds(): number {
		return Math.floor(this.millis / 1000) % 60;
	}

	getMinutes(): number {
		return Math.floor(this.millis / 60000) % 60;
	}

	getHours(): number {
		return Math.floor(this.millis / 3600000) % 24;
	}

	getDayOfWeek(): number {
		// Jan 1, 1970 was a Thursday (index 4 in a 0-Sun to 6-Sat system).
		const totalDays = Math.floor(this.millis / 86400000);
		return (totalDays + 4) % 7;
	}

	// =========================================================================
	// Comparison & Arithmetic
	// =========================================================================

	distanceFrom(other: Time): Duration {
		return new Duration(this.millis - other.millis);
	}

	isBefore(other: Time): boolean {
		return this.millis < other.millis;
	}

	isAfter(other: Time): boolean {
		return this.millis > other.millis;
	}

	isEqual(other: Time): boolean {
		return this.millis === other.millis;
	}

	plus(duration: Duration): Time {
		return new Time(this.millis + duration.millis);
	}

	minus(duration: Duration): Time {
		return new Time(this.millis - duration.millis);
	}
}
