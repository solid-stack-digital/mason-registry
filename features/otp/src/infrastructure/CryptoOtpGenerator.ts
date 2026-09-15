import { randomInt } from "node:crypto";
import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";

@MakeInjectable
export class CryptoOtpGenerator implements IOtpGenerator {
  public static deps = {};

  constructor(public deps: DepsType<typeof CryptoOtpGenerator.deps>) {}

  generate(length: number = 6): string {
    if (typeof length !== "number" || !Number.isInteger(length) || length <= 0) {
      throw new Error(`Invalid OTP length: ${length}. Must be a positive integer.`);
    }
    if (length > 32) {
      throw new Error(`OTP length exceeds maximum allowed limit of 32.`);
    }

    let result = "";
    for (let i = 0; i < length; i++) {
      result += randomInt(0, 10).toString();
    }
    return result;
  }
}
