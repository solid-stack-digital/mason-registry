import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { StaticOtpGenerator, StaticOtpToken } from "./StaticOtpGenerator.js";

describe("StaticOtpGenerator Infrastructure Adapter", () => {
	let container: Container;

	beforeEach(() => {
		container = new Container();
		container.provideValue(StaticOtpToken, "123456");
	});

	describe("Core Mechanics & Contract Fulfillment", () => {
		it("should return configured static OTP", () => {
			// Arrange
			container.provideValue(StaticOtpToken, "987654");
			const generator = container.resolve(StaticOtpGenerator);

			// Act
			const code = generator.generate();

			// Assert
			expect(code).toBe("987654");
		});

		it("should default to 123456 if default token provided", () => {
			// Arrange
			const generator = container.resolve(StaticOtpGenerator);

			// Act
			const code = generator.generate();

			// Assert
			expect(code).toBe("123456");
		});

		it("should slice or pad to requested length", () => {
			// Arrange
			container.provideValue(StaticOtpToken, "123456");
			const generator = container.resolve(StaticOtpGenerator);

			// Act & Assert
			expect(generator.generate(4)).toBe("1234");
			expect(generator.generate(8)).toBe("12345600");
		});
	});

	describe("Structural & Integrity Validation", () => {
		it("should throw for invalid length bounds", () => {
			// Arrange
			const generator = container.resolve(StaticOtpGenerator);

			// Act & Assert
			expect(() => generator.generate(0)).toThrow("Invalid OTP length");
			expect(() => generator.generate(-1)).toThrow("Invalid OTP length");
			expect(() => generator.generate(33)).toThrow(
				"exceeds maximum allowed limit",
			);
		});
	});
});
