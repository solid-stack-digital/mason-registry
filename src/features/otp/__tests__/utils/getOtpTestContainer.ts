import { Container } from "@solid-stack/di";
import mailingProvider from "@/features/mailing/diProvider.js";
import timeProvider from "@/shared/time/diProvider.js";
import uuidProvider from "@/shared/uuid/diProvider.js";
import provider from "../../diProvider.js";

export const getOtpTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	uuidProvider(container);
	mailingProvider(container);
	provider(container);
	return container;
};
