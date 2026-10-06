import type { Container, DIModule } from "@solid-stack/di";
import { IMailer } from "./domain/IMailer.js";
import { MailingError } from "./errors/MailingError.js";
import { MemoryMailer } from "./infrastructure/MemoryMailer.js";
import { InitialSendStatus, StubMailer } from "./infrastructure/StubMailer.js";

export const MailingProvider: DIModule = (c: Container) => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	const infraMode = process.env.INFRA_MODE || "isolated";
	if (infraMode === "isolated") {
		c.provideValue(InitialSendStatus, true);
		c.provide(IMailer, StubMailer);
	} else if (infraMode === "integrated") {
		c.provide(IMailer, MemoryMailer);
	} else {
		throw new MailingError(
			"Received an invalid INFRA_MODE env while loading mailing provider",
		);
	}
};

export default MailingProvider;
