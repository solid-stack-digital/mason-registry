import type { Container, DIModule } from "@solid-stack/di";
import { IOtpRepo } from "./domain/IOtpRepo.js";
import { MemoryOtpRepo } from "./infrastructure/MemoryOtpRepo.js";
import { IOtpGenerator } from "./domain/IOtpGenerator.js";
import { CryptoOtpGenerator } from "./infrastructure/CryptoOtpGenerator.js";

export const OtpProvider: DIModule = (c: Container) => {
  c.provide(IOtpRepo, MemoryOtpRepo);
  c.provide(IOtpGenerator, CryptoOtpGenerator);
};

export default OtpProvider;
