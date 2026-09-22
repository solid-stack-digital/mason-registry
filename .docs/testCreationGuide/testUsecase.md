**Context & Persona:**
Act as a Principal Software Engineer and Testing Expert specializing in Domain-Driven Design (DDD), Clean Architecture, and TypeScript. You are an expert in Vitest and the `@solid-stack/di` dependency injection framework.

**Task:**
I will provide you with the code for a **Use Case** (Application Layer) and its corresponding **Domain Interface** (Port). Your task is to generate a complete, highly detailed, robust, bulletproof, and future-proof unit test file for this Use Case.

**Architectural Strictness:**

1. **Total Isolation:** You must strictly test the application boundary. DO NOT import or use real infrastructure implementations. You must assume a `Stub[InterfaceName]` exists in the infrastructure layer. if the stub doesnt exist, then create it in /infrastructure/Stub[InterfaceName].ts
2. **Container State:** Every test must run in total isolation. Initialize a fresh DI container in a top-level `beforeEach`.
3. **DI Wiring:** Use `container.provide()` to bind the Domain Interface to the Stub. If the Stub requires `ValueToken`s for its initial state, inject them using `container.provideValue()`. Resolve both the Use Case and the Stub from the container.

**Testing Strategies & Coverage Requirements:**
Your generated test file must include `describe` blocks covering the following categories:

1. **Success Paths & Interactions (Contract Enforcement):**

- Test that the Use Case successfully executes with valid inputs.
- **Crucial:** You MUST use `vi.spyOn(stub, 'methodName')` to prove that the Use Case actually passed the exact, correct arguments to the injected port. Ensure it is called exactly the expected number of times (`toHaveBeenCalledTimes`).

2. **Edge Cases & Boundary Values:**

- Test how the Use Case handles empty strings `""`, zeroes `0`, empty objects `{}`, and boundary timestamps/numbers (if applicable to the domain).

3. **Validation & Runtime Type Safety:**

- If the Use Case performs input validation, bypass TypeScript using `as any` to test that runtime errors are thrown correctly (e.g., passing `null`, `undefined`, or incorrect primitives).

4. **Error Bubbling & Infrastructure Failures:**

- Simulate catastrophic port failures using `vi.spyOn(stub, 'method').mockRejectedValueOnce(new Error('...'))`.
- Prove that the Use Case either bubbles the error up predictably or handles it gracefully without crashing unexpectedly.

**Formatting Rules:**

- Use `vitest`.
- Group tests logically with highly descriptive `describe` and `it` block names (e.g., `"should bubble up errors thrown by the underlying infrastructure port"`).
- Separate the Arrange, Act, and Assert phases clearly within each test block.

**Code to Test:**

```typescript
[INSERT YOUR USE CASE CODE HERE]

```

**Domain Interface & Expected Stub Info:**

```typescript
[INSERT YOUR INTERFACE HERE]
// Note to AI: Assume a stub exists named `Stub[InterfaceName]`.
// It requires the following ValueTokens for initialization: [List tokens if any, e.g., InitialToken, InitialPayload]

```
