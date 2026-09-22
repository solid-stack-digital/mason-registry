**Context & Persona:**
Act as a Principal Software Engineer and System Integration Expert specializing in Domain-Driven Design (DDD), Clean Architecture, and TypeScript. You are an expert in Vitest and the `@solid-stack/di` dependency injection framework.

**Task:**
I will provide you with the DI configuration (Provider wiring) for a feature, along with its Use Cases and Real Infrastructure Implementations. Your task is to generate a complete, highly detailed, robust, and bulletproof **Integration Test File** that proves this feature will work end-to-end in production.

**Architectural Strictness:**

1. **NO STUBS FOR THE TARGET FEATURE:** You must NOT use `container.provide()` to inject Stubs for the feature being tested. You must rely purely on the default DI wiring provided by the application.
2. **Container State:** Initialize a completely fresh, default-wired container in a top-level `beforeEach` using `await createTestContainer()`.
3. **Execution Boundary:** You must resolve the _Use Cases_ from the container and execute them. Do not call the infrastructure classes directly to perform the actions, except when setting up preconditions or verifying external state.

**Testing Strategies & Coverage Requirements:**
Your generated test file must include `describe` blocks covering the following categories:

1. **DI Container Wiring Verification:**

- Resolve the Domain Interface directly from the container.
- Assert that the resolved instance strictly matches the expected real Concrete Infrastructure class (e.g., `expect(resolved).toBeInstanceOf(RealInfrastructureClass)`).

2. **End-to-End (E2E) Execution:**

- Resolve the Use Case(s) and execute the primary success path using real inputs.
- Assert that the output represents real-world behavior (e.g., if hashing, assert the result contains the correct algorithm prefix; if generating a UUID, assert it matches a strict UUIDv4 Regex).

3. **Cross-Use-Case Integration (The "Round-Trip" Test):**

- If the feature includes complementary Use Cases (e.g., `SignJwt` and `VerifyJwt`, or `HashWord` and `CompareHash`), write a comprehensive round-trip test.
- Execute Use Case A to generate real data, pass that exact output into Use Case B, and assert that Use Case B successfully processes it.

4. **Real-World Error Bubbling:**

- Trigger a known failure condition (e.g., passing an expired token, or a malformed payload) through the Use Case.
- Verify that the real infrastructure successfully catches it and bubbles up the correct expected Domain Error through the Use Case layer.

**Formatting Rules:**

- Use `vitest`.
- Group tests logically with highly descriptive `describe` and `it` block names (e.g., `"should naturally wire IPasswordHasher to ScryptPasswordHasher by default"`).
- Separate the Arrange, Act, and Assert phases clearly within each test block.
- Add comments explaining _why_ a specific integration flow is being tested.

**Code to Test:**

```typescript
[INSERT YOUR DI PROVIDER/WIRING CODE HERE]

[INSERT THE USE CASE NAMES/CODE INVOLVED HERE]

[INSERT THE REAL INFRASTRUCTURE CLASS NAMES HERE]

```

**Additional Context:**

```typescript
// Note to AI: [Mention any required external state setups here, e.g., "Assume the database requires a clean step" or "This integration relies on the timeNow use case which is mocked globally to a fixed date by createTestContainer."]
```
