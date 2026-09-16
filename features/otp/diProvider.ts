import type { Container, DIModule } from "@solid-stack/di";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";
import { IOtpEmailGateway } from "./domain/IOtpEmailGateway.js";
import { OtpEmailGateway } from "./infrastructure/OtpEmailGateway.js";

export const OtpProvider: DIModule = (c: Container) => {
  c.provide(IOtpRepo, MemoryOtpRepo);
  c.provide(IOtpGenerator, CryptoOtpGenerator);
  c.provide(IOtpEmailGateway, OtpEmailGateway);
};

export default OtpProvider;
