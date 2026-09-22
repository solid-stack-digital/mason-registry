import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type { ITimeEngine } from "../ports/ITimeEngine.js";

/**
 * Production implementation of ITimeEngine.
 * Handles system time retrieval and time transformations.
 */
@MakeInjectable
export class SystemTimeEngine implements ITimeEngine {
	public static deps = {};

	constructor(public deps: DepsType<typeof SystemTimeEngine.deps>) {}

	millisNow(): number {
		return Date.now();
	}

	millisToIso(millis: number): string {
		if (typeof millis !== "number" || isNaN(millis)) {
			throw new Error(`Invalid millis: ${millis}`);
		}
		return new Date(millis).toISOString();
	}

	isoToMillis(isoString: string): number {
		if (typeof isoString !== "string" || !isoString.trim()) {
			throw new Error(`Invalid ISO date string: ${isoString}`);
		}
		const millis = Date.parse(isoString);
		if (isNaN(millis)) {
			throw new Error(`Invalid ISO date string: ${isoString}`);
		}
		return millis;
	}

	millisToCivilDate(millis: number): {
		year: number;
		month: number;
		day: number;
	} {
		if (typeof millis !== "number" || isNaN(millis)) {
			throw new Error(`Invalid millis: ${millis}`);
		}
		const date = new Date(millis);
		return {
			year: date.getUTCFullYear(),
			month: date.getUTCMonth() + 1,
			day: date.getUTCDate(),
		};
	}

	civilDateToMillis(year: number, month: number, day: number): number {
		if (
			typeof year !== "number" ||
			typeof month !== "number" ||
			typeof day !== "number" ||
			isNaN(year) ||
			isNaN(month) ||
			isNaN(day)
		) {
			throw new Error(`Invalid civil date: ${year}-${month}-${day}`);
		}
		const date = new Date(0);
		date.setUTCFullYear(year, month - 1, day);
		date.setUTCHours(0, 0, 0, 0);

		if (
			date.getUTCFullYear() !== year ||
			date.getUTCMonth() + 1 !== month ||
			date.getUTCDate() !== day
		) {
			throw new Error(`Invalid civil date: ${year}-${month}-${day}`);
		}

		return date.getTime();
	}
}
