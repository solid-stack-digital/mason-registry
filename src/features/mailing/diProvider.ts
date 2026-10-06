import type { Container, DIModule } from "@solid-stack/di";
import { IMailer } from "./domain/IMailer.js";
import { MailingError } from "./errors/MailingError.js";
import { MemoryMailer } from "./infrastructure/MemoryMailer.js";

export const MailingProvider: DIModule = (c: Container) => {
	// TODO: Replace this environment lookup with your application's config loader after import.
	// An unset mode defaults to isolated; explicit invalid values are rejected.
	const infraMode = process.env.INFRA_MODE ?? "isolated";
	if (infraMode !== "isolated" && infraMode !== "integrated") {
		throw new MailingError(
			"Invalid INFRA_MODE: expected isolated or integrated",
		);
	}
	if (infraMode === "integrated") {
		// TODO: Implement and configure external adapters for mail delivery after import.
		throw new MailingError(
			"Integrated mailing infrastructure is not implemented: configure external adapters for mail delivery.",
		);
	} else {
		c.provide(IMailer, MemoryMailer);
	}
};

export default MailingProvider;
