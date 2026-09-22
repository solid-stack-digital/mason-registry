/**
 * Represents a duration of time with millisecond precision.
 * Immutable Value Object.
 */
export class Duration {
	public readonly millis: number; // Milliseconds

	constructor(millis: number) {
		this.millis = millis;
	}

	// Static Factory Methods

	static fromMillis(ms: number): Duration {
		return new Duration(ms);
	}

	static fromSeconds(sec: number): Duration {
		return new Duration(sec * 1000);
	}

	static fromMinutes(min: number): Duration {
		return new Duration(min * 60 * 1000);
	}

	static fromHours(hr: number): Duration {
		return new Duration(hr * 3600 * 1000);
	}

	static fromDays(days: number): Duration {
		return new Duration(days * 86400 * 1000);
	}

	// Conversion Methods
	toMillis(): number {
		return this.millis;
	}

	toSeconds(): number {
		return Math.floor(this.millis / 1000);
	}

	toMinutes(): number {
		return Math.floor(this.millis / 60000);
	}

	toHours(): number {
		return Math.floor(this.millis / 3600000);
	}

	toDays(): number {
		return Math.floor(this.millis / 86400000);
	}

	// Operations
	plus(other: Duration): Duration {
		return new Duration(this.millis + other.millis);
	}

	minus(other: Duration): Duration {
		return new Duration(this.millis - other.millis);
	}

	equals(other: Duration): boolean {
		return this.millis === other.millis;
	}
}
