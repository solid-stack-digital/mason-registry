import { Container } from "@solid-stack/di";
import timeProvider from "@/shared/time/diProvider.js";
import uuidProvider from "@/shared/uuid/diProvider.js";
import provider from "../../diProvider.js";

export const getOtpTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	uuidProvider(container);
	provider(container);
	return container;
};
