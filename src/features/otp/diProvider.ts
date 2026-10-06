import type { Container, DIModule } from "@solid-stack/di";
import { IOtpEmailGateway } from "./domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { DEFAULT_OTP_CONFIG } from "./domain/OtpConfig.js";
import { OtpError } from "./errors/OtpError.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { OtpEmailGateway } from "./infrastructure/OtpEmailGateway.js";
import { StubOtpEmailGateway } from "./infrastructure/StubOtpEmailGateway.js";
import {
	NextOtp,
	StubOtpGenerator,
} from "./infrastructure/StubOtpGenerator.js";
import { InitialOtps, StubOtpRepo } from "./infrastructure/StubOtpRepo.js";
import { OtpConfigToken } from "./tokens.js";

export const OtpProvider: DIModule = (c: Container) => {
	c.provideValue(OtpConfigToken, DEFAULT_OTP_CONFIG);
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provideValue(InitialOtps, []);
		c.provideValue(NextOtp, "123456");
		c.provide(IOtpRepo, StubOtpRepo);
		c.provide(IOtpGenerator, StubOtpGenerator);
		c.provide(IOtpEmailGateway, StubOtpEmailGateway);
	} else if (infraMode === "integrated") {
		c.provide(IOtpRepo, MemoryOtpRepo);
		c.provide(IOtpGenerator, CryptoOtpGenerator);
		c.provide(IOtpEmailGateway, OtpEmailGateway);
	} else {
		throw new OtpError(
			"Received an invalid INFRA_MODE env while loading otp provider",
		);
	}
};

export default OtpProvider;
