import type { Container, DIModule } from "@solid-stack/di";
import { IMailer } from "./domain/IMailer.js";
import { MemoryMailer } from "./infrastructure/MemoryMailer.js";

export const MailingProvider: DIModule = (c: Container) => {
	c.provide(IMailer, MemoryMailer);
};

export default MailingProvider;
