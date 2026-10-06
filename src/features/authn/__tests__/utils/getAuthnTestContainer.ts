import { Container } from "@solid-stack/di";
import emailAccessVerificationProvider from "@/features/emailAccessVerification/diProvider.js";
import mailingProvider from "@/features/mailing/diProvider.js";
import otpProvider from "@/features/otp/diProvider.js";
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
	mailingProvider(container);
	otpProvider(container);
	emailAccessVerificationProvider(container);
	provider(container);
	return container;
};
