import { describe, expect, it } from "vitest";
import { Duration } from "@/shared/time/domain/Duration.js";
import { Time } from "@/shared/time/domain/Time.js";
import { StubClock } from "@/shared/time/infrastructure/StubTimeEngine.js";
import { TokenExpiredError } from "../../errors/TokenExpiredError.js";
import { TokenIntegrityError } from "../../errors/TokenIntegrityError.js";
import { Jwt } from "../../Jwt.js";
import { HmacJwtEngine } from "../HmacJwtEngine.js";
import { StubJwt, StubJwtEngine } from "../StubJwtEngine.js";

describe("JWT Infrastructure & Jwt Service", () => {
	describe("HmacJwtEngine", () => {
		it("signs and verifies tokens correctly", async () => {
			const clock = new StubClock({}, new Time(1700000000000));
			const engine = new HmacJwtEngine({ clock });

			const token = await engine.sign(
				{ userId: "usr-123", role: "admin" },
				Duration.fromMinutes(15),
			);
			expect(typeof token).toBe("string");
			expect(token.split(".").length).toBe(3);

			const payload = await engine.verify<{ userId: string; role: string }>(
				token,
			);
			expect(payload.userId).toBe("usr-123");
			expect(payload.role).toBe("admin");
		});

		it("throws TokenExpiredError when token expiration passes", async () => {
			const clock = new StubClock({}, new Time(1700000000000));
			const engine = new HmacJwtEngine({ clock });

			const token = await engine.sign(
				{ userId: "usr-123" },
				Duration.fromMinutes(5),
			);

			// Advance clock by 10 minutes past expiration
			clock.advance(Duration.fromMinutes(10));

			await expect(engine.verify(token)).rejects.toThrow(TokenExpiredError);
		});

		it("allows verifying expired token when ignoreExpiration is true", async () => {
			const clock = new StubClock({}, new Time(1700000000000));
			const engine = new HmacJwtEngine({ clock });

			const token = await engine.sign(
				{ userId: "usr-123" },
				Duration.fromMinutes(5),
			);
			clock.advance(Duration.fromMinutes(10));

			const payload = await engine.verify<{ userId: string }>(token, {
				ignoreExpiration: true,
			});
			expect(payload.userId).toBe("usr-123");
		});

		it("throws TokenIntegrityError on malformed tokens", async () => {
			const clock = new StubClock({});
			const engine = new HmacJwtEngine({ clock });

			await expect(engine.verify("")).rejects.toThrow(TokenIntegrityError);
			await expect(engine.verify("part1.part2")).rejects.toThrow(
				TokenIntegrityError,
			);
			await expect(engine.verify("part1.part2.part3")).rejects.toThrow(
				TokenIntegrityError,
			);
			await expect(engine.verify(null as unknown as string)).rejects.toThrow(
				TokenIntegrityError,
			);
		});

		it("throws TokenIntegrityError on tampered token payload or signature", async () => {
			const clock = new StubClock({}, new Time(1700000000000));
			const engine = new HmacJwtEngine({ clock });

			const token = await engine.sign(
				{ userId: "user" },
				Duration.fromMinutes(10),
			);
			const parts = token.split(".");
			parts[1] = Buffer.from(JSON.stringify({ userId: "hacker" })).toString(
				"base64url",
			);
			const tampered = parts.join(".");

			await expect(engine.verify(tampered)).rejects.toThrow(
				TokenIntegrityError,
			);
		});

		it("rejects sign with invalid TTL", async () => {
			const clock = new StubClock({});
			const engine = new HmacJwtEngine({ clock });

			await expect(
				engine.sign({ userId: "u1" }, null as unknown as Duration),
			).rejects.toThrow("TTL must be an instance of Duration");
		});
	});

	describe("StubJwtEngine", () => {
		it("returns configured token and payload", async () => {
			const stub = new StubJwtEngine({});
			stub.setNextToken("custom-jwt-token");
			stub.setNextPayload({ userId: "test-user" });

			const token = await stub.sign({}, Duration.fromMinutes(5));
			expect(token).toBe("custom-jwt-token");

			const payload = await stub.verify(token);
			expect(payload).toEqual({ userId: "test-user" });
		});

		it("supports setting synthetic errors", async () => {
			const stub = new StubJwtEngine({});
			stub.setError(new Error("Key rotation failure"));

			await expect(stub.sign({}, Duration.fromMinutes(5))).rejects.toThrow(
				"Key rotation failure",
			);
			await expect(stub.verify("any-token")).rejects.toThrow(
				"Key rotation failure",
			);
		});
	});

	describe("StubJwt", () => {
		it("functions as Jwt with stub behavior", async () => {
			const stubJwt = new StubJwt({});
			stubJwt.setNextToken("stub-tok");
			stubJwt.setNextPayload({ sub: "subject-1" });

			const token = await stubJwt.sign(
				{ test: 1 },
				{ ttl: Duration.fromMinutes(1) },
			);
			expect(token).toBe("stub-tok");

			const payload = await stubJwt.verify(token);
			expect(payload).toEqual({ sub: "subject-1" });
		});
	});

	describe("Jwt Service", () => {
		it("delegates sign and verify to injected jwtEngine", async () => {
			const stubEngine = new StubJwtEngine({});
			stubEngine.setNextToken("delegated-token");
			stubEngine.setNextPayload({ email: "test@example.com" });

			const clock = new StubClock({});
			const jwt = new Jwt({ jwtEngine: stubEngine, clock });

			const token = await jwt.sign(
				{ some: "data" },
				{ ttl: Duration.fromMinutes(10) },
			);
			expect(token).toBe("delegated-token");

			const payload = await jwt.verify(token);
			expect(payload).toEqual({ email: "test@example.com" });
		});
	});
});
