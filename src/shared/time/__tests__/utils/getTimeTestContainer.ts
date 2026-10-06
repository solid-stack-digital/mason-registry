import { Container } from "@solid-stack/di";
import timeProvider from "../../diProvider.js";

export const getTimeTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	return container;
};
