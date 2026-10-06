import { Container } from "@solid-stack/di";
import hasherProvider from "@/shared/hasher/diProvider.js";
import jwtProvider from "@/shared/jwt/diProvider.js";
import timeProvider from "@/shared/time/diProvider.js";
import uuidProvider from "@/shared/uuid/diProvider.js";
import provider from "../../diProvider.js";

export const getAuthnTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	uuidProvider(container);
	hasherProvider(container);
	jwtProvider(container);
	provider(container);
	return container;
};
