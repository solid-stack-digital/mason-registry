import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { CryptoOtpGenerator } from "./CryptoOtpGenerator.js";

describe("CryptoOtpGenerator Infrastructure Adapter", () => {
	let container: Container;
	let generator: CryptoOtpGenerator;

	beforeEach(() => {
		// Arrange: Fresh DI container for total isolation
		container = new Container();
		generator = container.resolve(CryptoOtpGenerator);
	});

	describe("Core Mechanics & Contract Fulfillment", () => {
		it("should generate a 6-digit numeric OTP by default", () => {
			// Act
			const code = generator.generate();

			// Assert
			expect(code).toHaveLength(6);
			expect(/^\d{6}$/.test(code)).toBe(true);
		});

		it("should generate OTP of requested length", () => {
			// Act & Assert
			expect(generator.generate(4)).toHaveLength(4);
			expect(generator.generate(8)).toHaveLength(8);
			expect(generator.generate(12)).toHaveLength(12);
			expect(/^\d{8}$/.test(generator.generate(8))).toBe(true);
		});
	});

	describe("Library-Specific Edge Cases & Boundaries", () => {
		it("should handle boundary lengths 1 and 32 correctly", () => {
			// Act & Assert
			const minCode = generator.generate(1);
			expect(minCode).toHaveLength(1);
			expect(/^\d$/.test(minCode)).toBe(true);

			const maxCode = generator.generate(32);
			expect(maxCode).toHaveLength(32);
			expect(/^\d{32}$/.test(maxCode)).toBe(true);
		});

		it("should generate unique cryptographically strong OTPs without collisions", () => {
			// Act: Generate 100 consecutive codes
			const codes = new Set<string>();
			for (let i = 0; i < 100; i++) {
				codes.add(generator.generate(6));
			}

			// Assert: Highly unique distribution for 6 digits
			expect(codes.size).toBeGreaterThan(95);
		});
	});

	describe("Structural & Integrity Validation", () => {
		it("should throw when length is zero or negative", () => {
			// Act & Assert
			expect(() => generator.generate(0)).toThrow(
				"Invalid OTP length: 0. Must be a positive integer.",
			);
			expect(() => generator.generate(-5)).toThrow(
				"Invalid OTP length: -5. Must be a positive integer.",
			);
		});

		it("should throw when length exceeds maximum limit of 32", () => {
			// Act & Assert
			expect(() => generator.generate(33)).toThrow(
				"OTP length exceeds maximum allowed limit of 32.",
			);
		});

		it("should throw when length is non-integer or not a number", () => {
			// Act & Assert (bypassing TS)
			expect(() => generator.generate(5.5)).toThrow("Invalid OTP length");
			expect(() => generator.generate("6" as unknown as number)).toThrow(
				"Invalid OTP length",
			);
			expect(() => generator.generate(null as unknown as number)).toThrow(
				"Invalid OTP length",
			);
		});
	});
});
