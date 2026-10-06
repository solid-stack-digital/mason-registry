import { Container } from "@solid-stack/di";
import provider from "../../diProvider.js";

export const getHasherTestContainer = (): Container => {
	const container = new Container();
	provider(container);
	return container;
};
