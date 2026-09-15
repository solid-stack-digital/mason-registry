import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ITimeEngine } from "../ports/ITimeEngine.js";
import { Clock } from "../Clock.js";
import { Time } from "../domain/Time.js";
import { Duration } from "../domain/Duration.js";

/**
 * In-memory test stub for ITimeEngine.
 * Allows deterministic control over current time and time progression.
 */
@MakeInjectable
export class StubTimeEngine implements ITimeEngine {
  public static deps = {};
  private currentMillis: number;

  constructor(
    public deps: DepsType<typeof StubTimeEngine.deps>,
    initialMillis: number = 1700000000000,
  ) {
    this.currentMillis = initialMillis;
  }

  millisNow(): number {
    return this.currentMillis;
  }

  setMillis(millis: number): void {
    this.currentMillis = millis;
  }

  setTime(time: Time | number): void {
    this.currentMillis = typeof time === "number" ? time : time.millis;
  }

  advance(durationOrMillis: Duration | number): void {
    const ms =
      typeof durationOrMillis === "number"
        ? durationOrMillis
        : durationOrMillis.millis;
    this.currentMillis += ms;
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

/**
 * Test stub for Clock.
 * Wraps StubTimeEngine and exposes advance/setTime helpers.
 */
@MakeInjectable
export class StubClock implements Clock {
  public static deps = {};
  public readonly stubTimeEngine: StubTimeEngine;
  private readonly internalClock: Clock;
  public deps: { timeEngine: ITimeEngine };

  constructor(
    _deps: DepsType<typeof StubClock.deps>,
    initialTime?: Time | number,
  ) {
    const initialMillis =
      typeof initialTime === "number"
        ? initialTime
        : initialTime instanceof Time
          ? initialTime.millis
          : 1700000000000;
    this.stubTimeEngine = new StubTimeEngine({}, initialMillis);
    this.internalClock = new Clock({ timeEngine: this.stubTimeEngine });
    this.deps = { timeEngine: this.stubTimeEngine };
  }

  now(): Time {
    return this.internalClock.now();
  }

  toIso(time: Time): string {
    return this.internalClock.toIso(time);
  }

  fromIso(isoString: string): Time {
    return this.internalClock.fromIso(isoString);
  }

  toCivilDate(time: Time): { year: number; month: number; day: number } {
    return this.internalClock.toCivilDate(time);
  }

  fromCivilDate(year: number, month: number, day: number): Time {
    return this.internalClock.fromCivilDate(year, month, day);
  }

  duration(duration: string | number): Duration {
    return this.internalClock.duration(duration);
  }

  setTime(time: Time | number): void {
    this.stubTimeEngine.setTime(time);
  }

  setMillis(millis: number): void {
    this.stubTimeEngine.setMillis(millis);
  }

  advance(durationOrMillis: Duration | number): void {
    this.stubTimeEngine.advance(durationOrMillis);
  }
}
