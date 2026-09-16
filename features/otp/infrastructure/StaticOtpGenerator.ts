import { MakeInjectable, ValueToken, type DepsType } from "@solid-stack/di";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";

export type StaticOtp = string;
export class StaticOtpToken extends ValueToken<StaticOtp> {}

@MakeInjectable
export class StaticOtpGenerator implements IOtpGenerator {
  public static deps = {
    staticOtp: StaticOtpToken,
  };

  constructor(public deps: DepsType<typeof StaticOtpGenerator.deps>) {}

  generate(length: number = 6): string {
    if (
      typeof length !== "number" ||
      !Number.isInteger(length) ||
      length <= 0
    ) {
      throw new Error(
        `Invalid OTP length: ${length}. Must be a positive integer.`
      );
    }
    if (length > 32) {
      throw new Error(`OTP length exceeds maximum allowed limit of 32.`);
    }

    const code = this.deps.staticOtp || "123456";
    if (code.length >= length) {
      return code.slice(0, length);
    }
    return code.padEnd(length, "0");
  }
}
