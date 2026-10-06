import { Container } from "@solid-stack/di";
import jwtProvider from "@/shared/jwt/diProvider.js";
import timeProvider from "@/shared/time/diProvider.js";
import uuidProvider from "@/shared/uuid/diProvider.js";
import provider from "../../diProvider.js";

export const getEmailAccessVerificationTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	uuidProvider(container);
	jwtProvider(container);
	provider(container);
	return container;
};
