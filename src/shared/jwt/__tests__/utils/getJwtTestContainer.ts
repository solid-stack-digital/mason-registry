import { Container } from "@solid-stack/di";
import timeProvider from "@/shared/time/diProvider.js";
import jwtProvider from "../../diProvider.js";

export const getJwtTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	jwtProvider(container);
	return container;
};
