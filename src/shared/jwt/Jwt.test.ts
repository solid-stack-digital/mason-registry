import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { getJwtTestContainer } from "./__tests__/utils/getJwtTestContainer.js";
import { TokenExpiredError } from "./errors/TokenExpiredError.js";
import { TokenIntegrityError } from "./errors/TokenIntegrityError.js";
import { JwtEngine } from "./infrastructure/JwtEngine.js";
import { Jwt } from "./Jwt.js";

describe("Jwt", () => {
	let jwt: Jwt;
	let engine: JwtEngine;
	beforeEach(() => {
		vi.stubEnv("INFRA_MODE", "isolated");
		const container = getJwtTestContainer();
		jwt = container.resolve(Jwt);
		engine = container.resolve(JwtEngine);
	});
	afterEach(() => vi.unstubAllEnvs());

	it("forwards payload and TTL to the engine", async () => {
		const sign = vi.spyOn(engine, "sign").mockResolvedValue("controlled-token");
		const payload = { sub: "user-123" };
		const ttl = Duration.fromMinutes(5);
		const token = await jwt.sign(payload, { ttl });
		expect(token).toBe("controlled-token");
		expect(sign).toHaveBeenCalledWith(payload, ttl);
		const verify = vi.spyOn(engine, "verify").mockResolvedValue(payload);
		expect(await jwt.verify(token)).toMatchObject(payload);
		expect(verify).toHaveBeenCalledWith(token);
	});

	it("propagates expiration errors", async () => {
		const error = new TokenExpiredError("Token expired");
		vi.spyOn(engine, "verify").mockRejectedValue(error);
		await expect(jwt.verify("expired-token")).rejects.toBe(error);
	});

	it("propagates integrity errors", async () => {
		const error = new TokenIntegrityError("Invalid token");
		vi.spyOn(engine, "verify").mockRejectedValue(error);
		await expect(jwt.verify("invalid")).rejects.toBe(error);
	});
});
