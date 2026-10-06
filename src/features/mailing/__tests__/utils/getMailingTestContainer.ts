import { Container } from "@solid-stack/di";
import timeProvider from "@/shared/time/diProvider.js";

import provider from "../../diProvider.js";

export const getMailingTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);

	provider(container);
	return container;
};
