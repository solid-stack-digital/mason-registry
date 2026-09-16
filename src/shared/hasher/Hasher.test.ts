import { describe, it, expect } from "vitest";
import { Hasher } from "./Hasher.js";
import { StubHashEngine } from "./infrastructure/StubHashEngine.js";
import { ScryptHashEngine } from "./infrastructure/ScryptHashEngine.js";

describe("Hasher", () => {
  describe("with StubHashEngine", () => {
    it("hashes and compares plain text correctly", async () => {
      const stub = new StubHashEngine({});
      const hasher = new Hasher({ hashEngine: stub });

      const hashed = await hasher.hash("my-secret-password");
      expect(hashed).toBe("mock-hash$my-secret-password");

      const isValid = await hasher.compare(hashed, "my-secret-password");
      expect(isValid).toBe(true);

      const isInvalid = await hasher.compare(hashed, "wrong-password");
      expect(isInvalid).toBe(false);

      const verifyResult = await hasher.verify("my-secret-password", hashed);
      expect(verifyResult).toBe(true);
    });
  });

  describe("with ScryptHashEngine", () => {
    it("hashes and securely verifies plain text with salt", async () => {
      const engine = new ScryptHashEngine({});
      const hasher = new Hasher({ hashEngine: engine });

      const hashed = await hasher.hash("secure-pass-123");
      expect(hashed.startsWith("scrypt$")).toBe(true);

      const isValid = await hasher.compare(hashed, "secure-pass-123");
      expect(isValid).toBe(true);

      const isInvalid = await hasher.compare(hashed, "other-pass");
      expect(isInvalid).toBe(false);
    });

    it("throws when hashing empty string", async () => {
      const engine = new ScryptHashEngine({});
      const hasher = new Hasher({ hashEngine: engine });

      await expect(hasher.hash("")).rejects.toThrow("Password must be a non-empty string");
    });
  });
});
