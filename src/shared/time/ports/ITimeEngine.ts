export abstract class ITimeEngine {
	abstract millisNow(): number;
	abstract millisToIso(millis: number): string;
	abstract isoToMillis(isoString: string): number;
	abstract millisToCivilDate(millis: number): {
		year: number;
		month: number;
		day: number;
	};
	abstract civilDateToMillis(year: number, month: number, day: number): number;
}
