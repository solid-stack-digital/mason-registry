import { describe, it, expect } from "vitest";
import { Jwt } from "./Jwt.js";
import { StubJwtEngine } from "./infrastructure/StubJwtEngine.js";
import { HmacJwtEngine } from "./infrastructure/HmacJwtEngine.js";
import { Clock } from "@/shared/time/Clock.js";
import { StubTimeEngine } from "@/shared/time/infrastructure/StubTimeEngine.js";

describe("Jwt", () => {
  it("signs and verifies tokens using StubJwtEngine", async () => {
    const stubTime = new StubTimeEngine({}, 1700000000000);
    const clock = new Clock({ timeEngine: stubTime });
    const stubEngine = new StubJwtEngine({});
    const jwt = new Jwt({ jwtEngine: stubEngine, clock });

    stubEngine.setNextToken("custom-stub-token");
    stubEngine.setNextPayload({ userId: "user-123" });

    const token = await jwt.sign({ userId: "user-123" }, { ttl: clock.duration("1h") });
    expect(token).toBe("custom-stub-token");

    const payload = await jwt.verify<{ userId: string }>(token);
    expect(payload.userId).toBe("user-123");
  });

  it("signs and verifies tokens using HmacJwtEngine", async () => {
    const stubTime = new StubTimeEngine({}, 1700000000000);
    const clock = new Clock({ timeEngine: stubTime });
    const hmacEngine = new HmacJwtEngine({ clock });
    const jwt = new Jwt({ jwtEngine: hmacEngine, clock });

    const token = await jwt.sign({ sub: "user-456", role: "admin" }, { ttl: clock.duration("1h") });
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const verified = await jwt.verify<{ sub: string; role: string }>(token);
    expect(verified.sub).toBe("user-456");
    expect(verified.role).toBe("admin");
  });

  it("fails verification on expired token with HmacJwtEngine", async () => {
    const stubTime = new StubTimeEngine({}, 1700000000000);
    const clock = new Clock({ timeEngine: stubTime });
    const hmacEngine = new HmacJwtEngine({ clock });
    const jwt = new Jwt({ jwtEngine: hmacEngine, clock });

    const token = await jwt.sign({ sub: "user-456" }, { ttl: clock.duration("10s") });

    // Advance time past expiration (15 seconds)
    stubTime.advance(15000);

    await expect(jwt.verify(token)).rejects.toThrow("Token expired");
  });
});
