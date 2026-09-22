import type { Container, DIModule } from "@solid-stack/di";
import { IOtpEmailGateway } from "./domain/IOtpEmailGateway.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { DEFAULT_OTP_CONFIG } from "./domain/OtpConfig.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { OtpEmailGateway } from "./infrastructure/OtpEmailGateway.js";
import { OtpConfigToken } from "./tokens.js";

export const OtpProvider: DIModule = (c: Container) => {
	c.provideValue(OtpConfigToken, DEFAULT_OTP_CONFIG);
	c.provide(IOtpRepo, MemoryOtpRepo);
	c.provide(IOtpGenerator, CryptoOtpGenerator);
	c.provide(IOtpEmailGateway, OtpEmailGateway);
};

export default OtpProvider;
