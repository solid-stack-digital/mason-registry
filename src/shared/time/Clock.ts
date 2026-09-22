import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Duration } from "./domain/Duration.js";
import { Time } from "./domain/Time.js";
import { ITimeEngine } from "./ports/ITimeEngine.js";

@MakeInjectable
export class Clock {
	public static deps = { timeEngine: ITimeEngine };
	constructor(public readonly deps: DepsType<typeof Clock.deps>) {}

	now(): Time {
		const millis = this.deps.timeEngine.millisNow();
		return new Time(millis);
	}

	toIso(time: Time): string {
		const millis = time.millis;
		const iso = this.deps.timeEngine.millisToIso(millis);
		return iso;
	}

	fromIso(isoString: string): Time {
		const millis = this.deps.timeEngine.isoToMillis(isoString);
		return new Time(millis);
	}

	toCivilDate(time: Time): { year: number; month: number; day: number } {
		const millis = time.millis;
		const civilDate = this.deps.timeEngine.millisToCivilDate(millis);
		return civilDate;
	}

	fromCivilDate(year: number, month: number, day: number): Time {
		const millis = this.deps.timeEngine.civilDateToMillis(year, month, day);
		return new Time(millis);
	}

	// duration is milliseconds by default
	duration(duration: string | number): Duration {
		if (typeof duration === "string") {
			// detect the unit from the string, e.g., "100ms", "5.5s", "-10m", "2h", "1.5 d"
			const regex = /^(-?\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)$/i;
			const match = duration.match(regex);

			if (!match) {
				throw new Error(`Invalid duration string: ${duration}`);
			}

			const rawValue = match[1];
			const unit = match[2]?.toLowerCase();
			if (!rawValue || !unit) {
				throw new Error(`Invalid duration string: ${duration}`);
			}
			const value = parseFloat(rawValue);
			let millis: number;

			switch (unit) {
				case "ms":
					millis = value;
					break;
				case "s":
					millis = value * 1000;
					break;
				case "m":
					millis = value * 60 * 1000;
					break;
				case "h":
					millis = value * 60 * 60 * 1000;
					break;
				case "d":
					millis = value * 24 * 60 * 60 * 1000;
					break;
				case "w":
					millis = value * 7 * 24 * 60 * 60 * 1000;
					break;
				default:
					throw new Error(`Unknown duration unit: ${unit}`);
			}
			return new Duration(millis);
		} else if (typeof duration === "number") {
			// If it's a number, treat it as milliseconds
			return new Duration(duration);
		} else {
			throw new Error(`Invalid duration type: ${typeof duration}`);
		}
	}
}
