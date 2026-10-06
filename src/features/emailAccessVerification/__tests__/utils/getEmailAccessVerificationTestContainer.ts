import { Container } from "@solid-stack/di";
import mailingProvider from "@/features/mailing/diProvider.js";
import otpProvider from "@/features/otp/diProvider.js";
import jwtProvider from "@/shared/jwt/diProvider.js";
import timeProvider from "@/shared/time/diProvider.js";
import uuidProvider from "@/shared/uuid/diProvider.js";
import provider from "../../diProvider.js";

export const getEmailAccessVerificationTestContainer = (): Container => {
	const container = new Container();
	timeProvider(container);
	uuidProvider(container);
	jwtProvider(container);
	mailingProvider(container);
	otpProvider(container);
	provider(container);
	return container;
};
