import type { Container, DIModule } from "@solid-stack/di";
import { IOtpEmailGateway } from "./domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { DEFAULT_OTP_CONFIG } from "./domain/OtpConfig.js";
import { OtpError } from "./errors/OtpError.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { OtpEmailGateway } from "./infrastructure/OtpEmailGateway.js";
import { OtpConfigToken } from "./tokens.js";

export const OtpProvider: DIModule = (c: Container) => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new OtpError("Invalid INFRA_MODE: expected isolated or integrated");
	}
	if (infraMode === "integrated") {
		// TODO: Implement and configure external adapters for OTP persistence after import.
		throw new OtpError(
			"Integrated otp infrastructure is not implemented: configure external adapters for OTP persistence.",
		);
	} else {
		c.provide(IOtpRepo, MemoryOtpRepo);
	}
	c.provideValue(OtpConfigToken, DEFAULT_OTP_CONFIG);
	c.provide(IOtpGenerator, CryptoOtpGenerator);
	c.provide(IOtpEmailGateway, OtpEmailGateway);
};

export default OtpProvider;
