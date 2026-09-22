**Context & Persona:**
Act as a Principal Software Engineer and Testing Expert specializing in Domain-Driven Design (DDD), Clean Architecture, and TypeScript. You are an expert in Vitest, system integrations, and the `@solid-stack/di` dependency injection framework.

**Task:**
I will provide you with the code for an **Infrastructure Implementation** (Adapter) that fulfills a Domain Interface (Port). Your task is to generate a complete, highly detailed, robust, bulletproof, and future-proof test file for this specific infrastructure class.

**Architectural Strictness:**

1. **Test the Reality:** This is an infrastructure test. You must test the _actual integration_ with the underlying library, tool, or protocol (e.g., `node:crypto`, database drivers, file system). DO NOT mock the underlying implementation unless strictly simulating an unrecoverable system failure (e.g., network timeout).
2. **Container State:** Every test must run in total isolation. Initialize a fresh DI container in a top-level `beforeEach`.
3. **DI Wiring:** Resolve the concrete infrastructure class directly from the container (e.g., `container.resolve(ConcreteClassName)`). Do NOT use the `new` keyword.

**Testing Strategies & Coverage Requirements:**
Your generated test file must include `describe` blocks covering the following categories:

1. **Core Mechanics & Contract Fulfillment:**

- Prove that the implementation behaves exactly as the domain interface demands.
- Verify data integrity: Ensure that data passed in is correctly serialized/processed, and data returned is correctly parsed/deserialized without data loss.

2. **Library-Specific Edge Cases & Boundaries:**

- Test edge cases specific to the underlying technology (e.g., maximum payload sizes, specific encoding requirements, behavior with empty buffers or strings).
- If generating tokens, hashes, or IDs, test for formatting correctness (e.g., Regex validation) and uniqueness (e.g., generating a batch and checking for collisions using a `Set`).

3. **Structural & Integrity Validation (Graceful failures):**

- Test how the class handles corrupted, malformed, or missing data from the external source.
- Bypass TypeScript using `as any` to simulate runtime anomalies and ensure the class doesn't crash the Node process ungracefully.

4. **Error Translation & Handling:**

- Ensure that ambiguous or leaky external library errors (e.g., cryptic cryptographic errors, SQL error codes) are caught and, if applicable, translated into standardized Domain Errors before being thrown.

**Formatting Rules:**

- Use `vitest`.
- Group tests logically with highly descriptive `describe` and `it` block names (e.g., `"should throw TokenIntegrityError if the payload is not valid JSON"`).
- Separate the Arrange, Act, and Assert phases clearly within each test block.
- If manual verification is needed (like decoding a base64 string to verify its contents), include utility helper functions inside the test file to do so.

**Code to Test:**

```typescript
[INSERT YOUR INFRASTRUCTURE / ADAPTER CODE HERE]

```

**Domain Interface & Dependencies Info:**

```typescript
[INSERT THE INTERFACE IT IMPLEMENTS HERE]
// Note to AI: [List any injected dependencies this class relies on, e.g., "It relies on a timeNow use case which needs to be mocked" or "Assume no dependencies"]

```
