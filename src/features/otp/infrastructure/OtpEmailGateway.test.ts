import type { Container } from "@solid-stack/di";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SendEmail } from "@/features/mailing/useCases/SendEmail.js";
import { getOtpTestContainer } from "../__tests__/utils/getOtpTestContainer.js";
import { OtpEmailGateway } from "./OtpEmailGateway.js";

describe("OtpEmailGateway Infrastructure Adapter", () => {
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");

		container = getOtpTestContainer();

		sendEmailMock = container.resolve(SendEmail);
		vi.spyOn(sendEmailMock, "execute").mockResolvedValue({ ok: true });
		gateway = container.resolve(OtpEmailGateway);
	});
	afterEach(() => vi.unstubAllEnvs());
	let container: Container;

	let gateway: OtpEmailGateway;
	let sendEmailMock: SendEmail;

	describe("Core Mechanics & Contract Fulfillment", () => {
		it("should delegate email sending to the mailing feature SendEmail usecase", async () => {
			// Arrange
			const payload = {
				to: "user@example.com",
				subject: "Your OTP Code",
				body: "123456",
			};

			// Act
			await gateway.sendEmail(payload);

			// Assert
			expect(sendEmailMock.execute).toHaveBeenCalledTimes(1);
			expect(sendEmailMock.execute).toHaveBeenCalledWith({
				to: "user@example.com",
				subject: "Your OTP Code",
				body: "123456",
			});
		});
	});

	describe("Error Translation & Handling", () => {
		it("should bubble up errors thrown by the underlying SendEmail usecase", async () => {
			// Arrange
			vi.spyOn(sendEmailMock, "execute").mockRejectedValueOnce(
				new Error("SMTP server unreachable"),
			);

			// Act & Assert
			await expect(
				gateway.sendEmail({
					to: "fail@example.com",
					subject: "Fail",
					body: "Fail body",
				}),
			).rejects.toThrow("SMTP server unreachable");
		});
	});
});
