import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOtpTestContainer } from "../__tests__/utils/getOtpTestContainer.js";
import { StaticOtpToken } from "../configs/StaticOtpToken.js";
import { StaticOtpGenerator } from "./StaticOtpGenerator.js";

describe("StaticOtpGenerator Infrastructure Adapter", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getOtpTestContainer();
		container.provideValue(StaticOtpToken, "123456");
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

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
