import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { Time } from "@/shared/time/domain/Time.js";
import type { Otp } from "../domain/Otp.js";
import { InitialOtps, StubOtpRepo } from "./StubOtpRepo.js";

describe("StubOtpRepo", () => {
	let container: Container;

	const sampleOtp: Otp = {
		id: "otp-stub",
		recipientId: "user-1",
		recipientEmail: "user@example.com",
		purpose: "LOGIN",
		otpCode: "654321",
		attempts: 0,
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(1700000300000),
		createdAt: new Time(1700000000000),
		updatedAt: new Time(1700000000000),
	};

	beforeEach(() => {
		container = new Container();
		container.provideValue(InitialOtps, []);
	});

	it("should initialize with empty array when InitialOtps token provides empty array", () => {
		const repo = container.resolve(StubOtpRepo);
		expect(repo.getOtps()).toHaveLength(0);
	});

	it("should initialize with provided InitialOtps token", async () => {
		const c = new Container();
		c.provideValue(InitialOtps, [sampleOtp]);
		const repo = c.resolve(StubOtpRepo);

		const found = await repo.findLatestByRecipientAndPurpose("user-1", "LOGIN");
		expect(found).not.toBeNull();
		expect(found?.otpCode).toBe("654321");
	});

	it("should support addOtp, setOtps, and clear", () => {
		const repo = container.resolve(StubOtpRepo);
		repo.addOtp(sampleOtp);
		expect(repo.getOtps()).toHaveLength(1);

		repo.setOtps([sampleOtp, { ...sampleOtp, id: "otp-2" }]);
		expect(repo.getOtps()).toHaveLength(2);

		repo.clear();
		expect(repo.getOtps()).toHaveLength(0);
	});

	it("should simulate infrastructure failures via setError", async () => {
		const repo = container.resolve(StubOtpRepo);
		repo.setError(new Error("Database connection timed out"));

		await expect(repo.save(sampleOtp)).rejects.toThrow(
			"Database connection timed out",
		);
		await expect(repo.update(sampleOtp)).rejects.toThrow(
			"Database connection timed out",
		);
		await expect(
			repo.findLatestByRecipientAndPurpose("user-1", "LOGIN"),
		).rejects.toThrow("Database connection timed out");
	});
});
