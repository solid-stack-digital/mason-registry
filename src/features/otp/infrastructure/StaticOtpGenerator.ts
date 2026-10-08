import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { StaticOtpToken } from "../configs/StaticOtpToken.js";
import type { IOtpGenerator } from "../domain/IOtpGenerator.js";
import { OtpError } from "../errors/OtpError.js";

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
			throw new OtpError(
				`Invalid OTP length: ${length}. Must be a positive integer.`,
			);
		}
		if (length > 32) {
			throw new OtpError(`OTP length exceeds maximum allowed limit of 32.`);
		}

		const code = this.deps.staticOtp || "123456";
		if (code.length >= length) {
			return code.slice(0, length);
		}
		return code.padEnd(length, "0");
	}
}
