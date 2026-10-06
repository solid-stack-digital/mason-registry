import { Container } from "@solid-stack/di";
import HmacProvider from "../../diProvider.js";

export const getHmacTestContainer = async (): Promise<Container> => {
	const container = new Container();
	await HmacProvider(container);
	return container;
};
