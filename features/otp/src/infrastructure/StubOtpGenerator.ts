import { MakeInjectable, ValueToken, type DepsType } from "@solid-stack/di";
import { IOtpGenerator } from "../domain/IOtpGenerator.js";

export class NextOtp extends ValueToken<string> {}

@MakeInjectable
export class StubOtpGenerator implements IOtpGenerator {
  private nextOtp: string;

  public static deps = {
    nextOtp: NextOtp,
  };

  constructor(public deps: DepsType<typeof StubOtpGenerator.deps>) {
    this.nextOtp = deps.nextOtp || "123456";
  }

  public setNextOtp(otp: string): void {
    this.nextOtp = otp;
  }

  generate(_length?: number): string {
    return this.nextOtp;
  }
}
