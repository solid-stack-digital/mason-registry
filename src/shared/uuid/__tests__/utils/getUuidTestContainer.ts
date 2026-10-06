import { Container } from "@solid-stack/di";
import provider from "../../diProvider.js";

export const getUuidTestContainer = (): Container => {
	const container = new Container();
	provider(container);
	return container;
};
