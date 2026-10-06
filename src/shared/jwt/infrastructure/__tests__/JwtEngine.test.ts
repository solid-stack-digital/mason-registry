import { createHmac } from "node:crypto";
import jsonwebtoken from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { getJwtTestContainer } from "../../__tests__/utils/getJwtTestContainer.js";
import { SecretToken } from "../../configs/SecretToken.js";
import { JwtError } from "../../errors/JwtError.js";
import { TokenExpiredError } from "../../errors/TokenExpiredError.js";
import { TokenIntegrityError } from "../../errors/TokenIntegrityError.js";
import { JwtEngine } from "../JwtEngine.js";

describe("JwtEngine", () => {
	let engine: JwtEngine;
	let clock: StubTimeEngine;
	let secret: string;
	const ttl = Duration.fromMinutes(5);
	const signedToken = (header: unknown, payload: unknown): string => {
		const data = [header, payload]
			.map((value) => Buffer.from(JSON.stringify(value)).toString("base64url"))
			.join(".");
		return `${data}.${createHmac("sha256", secret).update(data).digest("base64url")}`;
	};
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		const container = getJwtTestContainer();
		secret = container.resolve(SecretToken);
		engine = container.resolve(JwtEngine);
		clock = container.resolve(StubTimeEngine);
	});
	afterEach(() => vi.unstubAllEnvs());

	it("produces an independently verifiable HS256 token with timestamps", async () => {
		const payload = { sub: "user", name: "你好", nested: { roles: ["admin"] } };
		const token = await engine.sign(payload, ttl);
		const parts = token.split(".");
		expect(parts).toHaveLength(3);
		expect(parts[2]).toBe(
			createHmac("sha256", secret)
				.update(parts.slice(0, 2).join("."))
				.digest("base64url"),
		);
		expect(
			JSON.parse(Buffer.from(parts[0] ?? "", "base64url").toString()),
		).toEqual({ alg: "HS256", typ: "JWT" });
		expect(await engine.verify(token)).toEqual({
			...payload,
			iat: 1700000000,
			exp: 1700000300,
		});
		expect(payload).not.toHaveProperty("exp");
	});

	it.each(["text", 42, null])("wraps primitive payload %j", async (data) => {
		const token = await engine.sign(data, ttl);
		expect(await engine.verify(token)).toMatchObject({ data });
	});

	it("expires at the exact expiration boundary and supports explicit expiration bypass", async () => {
		const token = await engine.sign({ sub: "user" }, ttl);
		clock.advance(ttl.millis - 1000);
		await expect(engine.verify(token)).resolves.toMatchObject({ sub: "user" });
		clock.advance(1000);
		await expect(engine.verify(token)).rejects.toMatchObject({
			expiredAt: new Date(1700000300000),
		});
		await expect(engine.verify(token)).rejects.toThrow(TokenExpiredError);
		await expect(
			engine.verify(token, { ignoreExpiration: true }),
		).resolves.toMatchObject({ sub: "user" });
	});

	it.each(["", "a.b", "a.b.c.d", "a..c", "a.b.c", null, 42])(
		"rejects malformed token %j",
		async (token) => {
			await expect(engine.verify(token as string)).rejects.toThrow(
				TokenIntegrityError,
			);
		},
	);

	it("rejects tampered payloads and signatures", async () => {
		const token = await engine.sign({ sub: "user" }, ttl);
		const parts = token.split(".");
		parts[1] = Buffer.from(JSON.stringify({ sub: "attacker" })).toString(
			"base64url",
		);
		await expect(engine.verify(parts.join("."))).rejects.toThrow(
			TokenIntegrityError,
		);
		await expect(engine.verify(`${token}x`)).rejects.toThrow(
			TokenIntegrityError,
		);
	});

	it.each([null, [], "text", { exp: "tomorrow" }])(
		"rejects signed invalid payload %j",
		async (payload) => {
			await expect(
				engine.verify(signedToken({ alg: "HS256", typ: "JWT" }, payload)),
			).rejects.toThrow(TokenIntegrityError);
		},
	);

	it("rejects an unsupported algorithm even with a valid signature", async () => {
		await expect(
			engine.verify(signedToken({ alg: "none", typ: "JWT" }, {})),
		).rejects.toThrow(TokenIntegrityError);
	});

	it("rejects invalid TTL and unserializable payloads with domain errors", async () => {
		await expect(engine.sign({}, null as unknown as Duration)).rejects.toThrow(
			JwtError,
		);
		const circular: { self?: unknown } = {};
		circular.self = circular;
		await expect(engine.sign(circular, ttl)).rejects.toThrow(JwtError);
		await expect(engine.sign(1n, ttl)).rejects.toThrow(JwtError);
	});

	it("requires an explicit non-empty secret", async () => {
		const container = getJwtTestContainer();
		container.provideValue(SecretToken, "");
		await expect(container.resolve(JwtEngine).sign({}, ttl)).rejects.toThrow(
			JwtError,
		);
	});

	it("verifies tokens issued by jsonwebtoken", async () => {
		const token = jsonwebtoken.sign(
			{ sub: "external", iat: 1700000000, exp: 1700000300 },
			secret,
			{ algorithm: "HS256" },
		);
		await expect(engine.verify(token)).resolves.toMatchObject({
			sub: "external",
		});
	});

	it("issues tokens accepted by jsonwebtoken", async () => {
		const token = await engine.sign({ sub: "user" }, ttl);
		expect(
			jsonwebtoken.verify(token, secret, {
				algorithms: ["HS256"],
				clockTimestamp: 1700000000,
			}),
		).toMatchObject({ sub: "user", exp: 1700000300 });
	});

	it("rejects tokens before their not-before claim using the injected clock", async () => {
		const token = jsonwebtoken.sign(
			{ nbf: 1700000060, exp: 1700000300 },
			secret,
		);
		await expect(engine.verify(token)).rejects.toThrow(TokenIntegrityError);
		clock.advance(60000);
		await expect(engine.verify(token)).resolves.toMatchObject({
			nbf: 1700000060,
		});
	});
});
