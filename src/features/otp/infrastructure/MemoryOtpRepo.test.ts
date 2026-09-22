import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { Time } from "@/shared/time/domain/Time.js";
import type { Otp } from "../domain/Otp.js";
import { MemoryOtpRepo } from "./MemoryOtpRepo.js";

describe("MemoryOtpRepo Infrastructure Adapter", () => {
	let container: Container;
	let repo: MemoryOtpRepo;

	const createSampleOtp = (overrides: Partial<Otp> = {}): Otp => ({
		id: "otp-1",
		recipientId: "user-1",
		recipientEmail: "user@example.com",
		purpose: "EMAIL_VERIFICATION",
		otpCode: "123456",
		attempts: 0,
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(1700000300000),
		createdAt: new Time(1700000000000),
		updatedAt: new Time(1700000000000),
		...overrides,
	});

	beforeEach(() => {
		// Arrange: Fresh DI container for total isolation
		container = new Container();
		repo = container.resolve(MemoryOtpRepo);
	});

	describe("Core Mechanics & Contract Fulfillment", () => {
		it("should save and retrieve the latest OTP for recipient and purpose", async () => {
			// Arrange
			const otpOld = createSampleOtp({
				id: "otp-old",
				createdAt: new Time(1700000000000),
				otpCode: "111111",
			});
			const otpNew = createSampleOtp({
				id: "otp-new",
				createdAt: new Time(1700000050000),
				otpCode: "222222",
			});

			// Act
			await repo.save(otpOld);
			await repo.save(otpNew);

			const found = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert
			expect(found).not.toBeNull();
			expect(found?.id).toBe("otp-new");
			expect(found?.otpCode).toBe("222222");
		});

		it("should return null if no OTP matches recipient and purpose", async () => {
			// Act
			const found = await repo.findLatestByRecipientAndPurpose(
				"non-existent",
				"LOGIN",
			);

			// Assert
			expect(found).toBeNull();
		});

		it("should update an existing OTP preserving isInvalidated and other properties", async () => {
			// Arrange
			const otp = createSampleOtp();
			await repo.save(otp);

			// Act
			otp.attempts = 3;
			otp.isInvalidated = true;
			otp.updatedAt = new Time(1700000100000);
			await repo.update(otp);

			const updated = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert
			expect(updated).not.toBeNull();
			expect(updated?.attempts).toBe(3);
			expect(updated?.isInvalidated).toBe(true);
		});

		it("should append on update if OTP ID was not found", async () => {
			// Arrange
			const otp = createSampleOtp({ id: "otp-new-id" });

			// Act
			await repo.update(otp);
			const found = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert
			expect(found?.id).toBe("otp-new-id");
		});
	});

	describe("Data Integrity & Defensive Cloning", () => {
		it("should defensively clone entities so external mutations do not corrupt stored state", async () => {
			// Arrange
			const otp = createSampleOtp();
			await repo.save(otp);

			// Act: Mutate local object after save
			otp.attempts = 99;
			otp.isUsed = true;

			const fetched = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert: Stored entity remains intact
			expect(fetched?.attempts).toBe(0);
			expect(fetched?.isUsed).toBe(false);

			// Act: Mutate fetched object
			if (fetched) {
				fetched.attempts = 42;
			}

			const refetched = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert: Stored entity still remains intact
			expect(refetched?.attempts).toBe(0);
		});

		it("should clear all records when clear() is invoked", async () => {
			// Arrange
			await repo.save(createSampleOtp());

			// Act
			repo.clear();

			const found = await repo.findLatestByRecipientAndPurpose(
				"user-1",
				"EMAIL_VERIFICATION",
			);

			// Assert
			expect(found).toBeNull();
		});
	});
});
