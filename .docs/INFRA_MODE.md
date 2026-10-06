# Infrastructure mode specification

## 1. Purpose and status

`INFRA_MODE` controls how features and shared modules satisfy their infrastructure dependencies. It determines whether an application uses configured external infrastructure or local implementations that do not require that infrastructure.

The supported modes are `isolated` and `integrated`.

This document specifies the required behavior for registry modules and applications that import them. The registry providers implement these selection rules. Integrated capabilities that do not yet have external adapters fail explicitly; their current availability is listed in section 12.

In this document:

- **MUST** identifies a requirement.
- **MUST NOT** identifies prohibited behavior.
- **SHOULD** identifies the expected approach unless a module documents a concrete reason to differ.
- **MAY** identifies an optional choice.

The central distinction is:

> Infrastructure mode selects runtime adapters. Tests explicitly select test doubles when they need controlled behavior.

## 2. Definitions

### 2.1 Port

A port is a contract consumed by a feature or shared module, such as `ICredentialRepo`, `IEAVGateway`, `IMailer`, or `IHashEngine`.

The consumer MUST depend on the contract. Its provider binds that contract to an implementation.

### 2.2 Actual implementation

An actual implementation performs the operation promised by its contract using the selected technology or another module. Examples include:

- Computing password hashes with scrypt.
- Signing and verifying JWTs with a JWT library.
- Reading the system clock.
- Generating UUIDs using cryptographic randomness.
- Delegating an OTP email to the mailing module through `OtpEmailGateway`.
- Storing records through a configured database adapter.

Actual implementations can be entirely local or depend on external infrastructure.

### 2.3 External infrastructure

External infrastructure is a service or separately provisioned resource that the application depends on outside its own process. It normally requires a running service, provisioned resources, connection details, credentials, or other setup beyond installing application packages.

Examples include Firebase, Supabase, a database server, an SMTP server, an email delivery API, an object storage service, a hosted identity provider, and a remote queue.

The boundary depends on what the implementation needs at runtime, not on the package publisher or the location of the service:

- An installed JWT package is local computation.
- An installed Firebase SDK that connects to Firebase requires external infrastructure.
- A database running in Docker on the same computer is still external infrastructure.
- A configured service emulator is still a separately running service.
- A secret supplied to a local HMAC or JWT implementation is configuration, but does not by itself make that implementation external infrastructure.

Downloading dependencies during installation is separate from runtime infrastructure selection.

### 2.4 In-memory implementation

An in-memory implementation satisfies a port using state maintained in the application process. It is a usable local implementation with actual behavior, rather than a collection of preconfigured responses.

Examples include:

- A repository that stores, queries, updates, and deletes records.
- A mailer that records outgoing messages for local inspection.
- An event publisher that records events or delivers them to local subscribers according to its contract.

State normally disappears when the process or container is recreated. An in-memory implementation does not provide external delivery or durable storage.

`MemoryX` and `InMemoryX` are acceptable names. A class name alone does not establish compliance; its behavior and the mode in which it is selected matter.

### 2.5 Stub and other test doubles

A stub is a test-specific implementation used to control a collaborator's output or behavior. It may expose controls such as:

- Return a chosen OTP or ID.
- Set a fixed time and advance it.
- Return a chosen validation result.
- Throw a chosen error.
- Record calls for assertions.

Spies and mocks are also test tools. This document uses **test double** when a rule applies to all of them.

Both an in-memory implementation and a stub may record calls or keep state. Their roles differ: the former provides local runtime behavior; the latter gives a test explicit control over a collaborator.

## 3. Meaning of each mode

### 3.1 `INFRA_MODE=isolated`

Isolated mode MUST allow the participating modules to operate without configured external services.

For each port, its provider MUST apply these rules:

1. If an existing feature or shared module can implement the port, use the actual adapter to that module.
2. If the operation can run locally using application code, runtime APIs, or an installed package, use the actual implementation.
3. If the implementation requires external infrastructure, use an in-memory implementation of the port.

The third rule applies at the external boundary. A gateway to another module remains actual even when that module has an external dependency. The dependency module's provider selects its own in-memory implementation.

Isolated mode MUST NOT automatically select stubs, fixed clocks, predictable IDs, constant OTPs, fake password hashes, or unconditional validation results.

Isolated mode is useful for local development, demonstrations, automated tests, and exercising multiple modules together. It does not imply that every test is a unit test, that execution is deterministic, or that every collaborator has been replaced.

### 3.2 `INFRA_MODE=integrated`

Integrated mode MUST use the actual implementations intended to communicate with configured infrastructure.

Local computation and gateways to other modules remain actual. Ports backed by external infrastructure MUST use their configured service adapters.

Integrated mode MUST NOT silently fall back to an in-memory implementation or stub because configuration is missing, a service is unavailable, or an adapter has not been implemented.

If a required adapter or its configuration is unavailable, the application MUST report an explicit error when loading, initializing, or resolving that required dependency. Connection failures during execution MUST also remain observable through the module's error contract.

An integrated adapter may point to a development service, an emulator, a staging environment, or production infrastructure. Mode selection alone does not determine which deployment environment is used.

### 3.3 The mode is independent of execution context

`INFRA_MODE` MUST NOT be treated as a synonym for `NODE_ENV`, `EXEC_MODE`, or a test runner flag.

Examples of valid combinations include:

- A development application in isolated mode using actual business logic and in-memory repositories.
- A development application in integrated mode using a configured development database.
- A feature unit test in isolated mode with explicitly registered gateway stubs.
- A gateway integration test in isolated mode using actual module adapters and an in-memory external boundary.
- An external adapter test in integrated mode against a configured test service.

Choosing a test double is a test setup decision. Neither mode automatically makes that decision.

## 4. Selection matrix

| Dependency or operation | Isolated provider binding | Integrated provider binding | Possible explicit test override |
| --- | --- | --- | --- |
| Gateway to another feature | Actual gateway | Actual gateway | Gateway stub |
| Gateway to a shared module | Actual adapter or facade | Actual adapter or facade | Stub for the consumed contract |
| Password hashing | Actual hashing engine | Actual hashing engine | Hash engine stub |
| JWT signing and verification | Actual JWT engine | Actual JWT engine | Engine stub or method spy |
| HMAC signing and verification | Actual HMAC engine | Actual HMAC engine | HMAC engine stub |
| Current time | System clock | System clock | Controllable time engine |
| UUID generation | Actual UUID generator | Actual UUID generator | Predictable ID generator |
| OTP generation | Actual generator | Actual generator | Controllable OTP generator |
| Externally stored records | In-memory repository | Configured database adapter | Repository stub |
| Email delivery | In-memory mailer | Configured delivery adapter | Mailer stub |
| External event or queue delivery | In-memory implementation of the contract | Configured delivery adapter | Publisher or queue stub |
| External object storage | In-memory storage | Configured storage adapter | Storage stub |
| Hosted identity or remote verification | In-memory implementation with documented local semantics | Configured service adapter | Identity or verification stub |

Some ports use the same implementation in both modes. A module MUST NOT invent a mode-specific replacement when the actual operation is already local.

For externally authoritative operations, the in-memory implementation MUST document how local identities, verification state, or other required data are established. It MUST NOT silently approve every request. If a meaningful local implementation is unavailable, isolated support for that capability is incomplete and MUST fail explicitly or be documented as unsupported.

## 5. Composition across modules

### 5.1 Preserve actual module boundaries

Consider this dependency chain:

```text
authn
  -> EAVGateway
  -> emailAccessVerification
  -> OtpGateway
  -> otp
  -> OtpEmailGateway
  -> mailing
  -> IMailer implementation
```

In isolated mode, the gateways and participating use cases MUST remain actual. Only the external mail boundary changes to an in-memory mailer. Repositories backed by external databases similarly change to in-memory repositories in their respective modules.

In integrated mode, the gateways and use cases remain actual, and mailing selects its configured delivery adapter.

An upstream module MUST NOT replace its gateway with a stub merely because a downstream module eventually uses an external service.

### 5.2 Provider ownership

Each module's `diProvider.ts` MUST own the bindings for that module's ports and required configuration tokens.

Providers MUST NOT register test doubles in either mode. In particular, production providers MUST NOT import `StubX` implementations to select them based on `INFRA_MODE` or test execution flags.

An upstream module SHOULD consume a dependency module through its public provider, facade, or supported use-case boundary. It MUST NOT require knowledge of that dependency's test doubles to configure normal runtime behavior.

The application composition root, or an explicit composition helper, MUST register the participating module providers before resolving consumers. Provider registration does not by itself imply that dependency providers have been loaded automatically. Any automatic provider composition mechanism MUST be explicit and consistent with the application's DI framework.

### 5.3 Mode propagation

Participating providers SHOULD read the same validated application mode. Mixed runtime modes MUST NOT happen accidentally through inconsistent defaults or separate environment readers.

Tests MAY intentionally override selected bindings after loading providers. That is an explicit test configuration, not a third infrastructure mode.

### 5.4 Example provider structure

The following is illustrative pseudocode. `ConfiguredOtpRepository` represents an external adapter that must actually be implemented and configured; it is not a claim that such a class currently exists in the registry.

```ts
export const otpProvider = (container: Container): void => {
  const mode = loadInfraMode();

  // Actual local implementations apply to both modes.
  container.provide(IOtpGenerator, CryptoOtpGenerator);
  container.provide(IOtpEmailGateway, OtpEmailGateway);

  if (mode === "isolated") {
    container.provide(IOtpRepo, MemoryOtpRepo);
  } else {
    container.provide(IOtpRepo, ConfiguredOtpRepository);
  }
};
```

`loadInfraMode()` in this example MUST validate the mode before either branch is selected. The application's composition root must also load mailing and the shared dependencies required by OTP.

## 6. In-memory behavior requirements

### 6.1 Preserve the observable contract

An in-memory implementation MUST satisfy the same input, output, and error contract as the port it implements.

Repository implementations SHOULD preserve observable rules such as:

- Uniqueness requirements that the port promises.
- Query filtering and ordering.
- Updates, deletions, and invalidation.
- Missing-record behavior.
- Pagination semantics where applicable.
- Consistency and atomicity guarantees that are part of the port's contract.

Business rules SHOULD remain in the domain or application layer rather than being reimplemented differently for each adapter. Adapter-enforced constraints that are part of the port's contract still need corresponding local behavior.

If an in-memory implementation cannot provide a required guarantee, the module MUST document that limitation. It MUST NOT silently present incompatible behavior as equivalent.

### 6.2 Perform meaningful local work

An in-memory repository MUST actually store and retrieve records. An in-memory mailer SHOULD capture the recipient, subject, body, and relevant metadata so local users and tests can inspect the message.

An in-memory mailer can report successful local acceptance according to its port, but MUST NOT claim that a real external recipient received the message. Documentation and application behavior MUST distinguish local capture from external delivery when that distinction matters to a user.

### 6.3 State and persistence

In-memory state SHOULD belong to an adapter instance or its explicitly scoped store. Independent application or test containers SHOULD receive independent state unless shared state is deliberately configured.

Runtime in-memory implementations MUST NOT depend on global test fixtures or preconfigured test responses.

State is normally temporary. Persistence across process restarts, replication, network failures, provider limits, and database-specific transaction behavior require separate implementations or verification. Passing in-memory tests does not establish those properties.

### 6.4 No hidden external dependencies

An isolated in-memory adapter MUST NOT require an external account, a running service, or service credentials to initialize or perform its normal operations.

It MUST NOT make hidden external requests through constructors, SDK initialization, health checks, or fallback paths. An installed package remains appropriate only when its selected execution path is local.

Local application configuration is still allowed. For example, an actual JWT engine still needs signing configuration, and business logic still needs TTLs and other settings.

## 7. Configuration and environment loading

### 7.1 Accepted values

The canonical environment variable is `INFRA_MODE`. Its supported values are exactly:

```text
isolated
integrated
```

Provider-facing configuration MUST resolve to one of these values. Unsupported or malformed explicit values MUST throw a clear configuration error; they MUST NOT silently select isolated mode.

Registry examples MAY default an unset variable to `isolated` for local use. This default MUST be documented and MUST NOT turn an invalid explicit value into a valid mode. An importing application MAY require an explicit value instead.

Applications using externally configured infrastructure SHOULD select `integrated` explicitly.

### 7.2 Load the mode before resolving consumers

The mode MUST be established before registering mode-dependent providers. Changing an environment variable after providers have run does not automatically change existing bindings or already-resolved instances.

The mode is a composition-time choice. Providers MUST NOT use it to switch implementations midway through an operation.

### 7.3 Import customization TODOs

Registry providers that read environment values directly MUST include an actionable TODO for the importing application, for example:

```ts
// TODO: Replace this environment lookup with your application's config loader after import.
```

Placeholder configuration for secrets or external services MUST also carry an actionable TODO. Importing applications MUST supply actual required configuration through their own configuration mechanism.

A placeholder secret is not a stub implementation, but replacing an engine with a stub is not a solution for missing signing configuration. The two concerns MUST be handled separately.

### 7.4 Integrated configuration failures

A required integrated adapter MUST report missing or invalid configuration clearly. If only an in-memory adapter exists for a service-backed port, that module does not yet have a complete integrated implementation.

Registering `MemoryMailer` as the integrated mailer, for example, does not satisfy external delivery simply because it is a concrete class. The application needs an actual delivery adapter or an explicit unsupported-capability error.

## 8. Test-double policy

### 8.1 Register test doubles explicitly

Tests MUST explicitly register any stub required by their scenario. Loading a provider in isolated mode MUST NOT be assumed to have loaded stubs.

Tests SHOULD replace only the collaborators whose behavior they need to control or exclude from the scope being tested. A test MAY keep an actual local engine or in-memory repository when that behavior is useful to the scenario.

For example:

- An authn use-case test can replace `IEAVGateway` with `StubEAVGateway`.
- A password-error scenario can replace the consumed hashing contract with a stub that throws.
- A TTL test can replace `ITimeEngine` with a controllable time engine.
- An OTP scenario can replace `IOtpGenerator` with a generator that returns a chosen code.

These replacements belong in test setup or test utilities. They MUST NOT be selected by production providers.

### 8.2 Required setup order

Tests MUST use this order when overriding a collaborator:

1. Establish the desired mode and create a fresh container.
2. Register the relevant module providers.
3. Register required stub bindings and configuration values.
4. Resolve the stub and configure its behavior.
5. Resolve the consumer under test.
6. Execute and assert the scenario.

All providers affecting the overridden port MUST run before the override. Otherwise a later provider may replace the test's binding.

All overrides and required value tokens MUST be registered before resolving a consumer that captures those dependencies. Tests MUST NOT assume that changing a binding rewires objects that have already been resolved.

### 8.3 Example: independent feature test setup

This setup shows how an authn test can control its email verification collaborator. Credential seeding and scenario assertions are omitted because they depend on the particular use-case test.

```ts
beforeEach(() => {
  vi.stubEnv("INFRA_MODE", "isolated");
  container = getAuthnTestContainer();

  container.provide(IEAVGateway, StubEAVGateway);
  const gateway = container.resolve(StubEAVGateway);
  gateway.setErrorToThrow(new Error("Token already used"));

  verifyEmail = container.resolve(VerifyEmail);
});

afterEach(() => vi.unstubAllEnvs());
```

The helper in this example registers authn and its required shared providers without resolving authn consumers. Because the test replaces `IEAVGateway` before resolution, it does not need the email access verification feature's provider.

Some DI frameworks resolve concrete classes automatically. Tests must still bind the consumed port to the stub; merely resolving a stub class does not make consumers use it.

### 8.4 Fresh state and cleanup

Tests MUST use fresh containers or equivalent explicitly isolated state. They MUST restore environment changes, spies, and other global changes where applicable.

Test controls such as fixed time or predictable IDs MUST be local to the test setup. They MUST NOT become isolated-mode runtime defaults.

## 9. Test categories and scope

### 9.1 Feature and shared-module unit tests

Unit tests verify the behavior of the chosen consumer within its stated boundary.

Feature tests SHOULD use gateway stubs when another feature's behavior is outside that boundary. This keeps a feature independently testable without loading the other feature's provider.

Shared-module tests can similarly replace the engine or other collaborator consumed by a facade. Actual engines SHOULD have their own infrastructure tests.

Unit tests SHOULD exercise input validation, business decisions, port arguments, outcomes, and error handling. They MUST NOT rely on infrastructure mode to imply mocked collaborator behavior.

### 9.2 Actual gateway tests

Actual gateway tests belong beside the adapter, for example:

```text
src/features/otp/infrastructure/OtpEmailGateway.test.ts
src/features/emailAccessVerification/infrastructure/OtpGateway.test.ts
src/features/authn/infrastructure/EAVGateway.test.ts
```

These tests MUST load the participating module providers and exercise the actual gateway with the actual downstream facade or use case.

The gateway under test and the downstream behavior being verified MUST NOT be replaced with success-returning stubs or mocked methods. A test that only asserts a mocked downstream call does not establish that the modules work together.

External boundaries MAY remain in memory in isolated mode. A test MAY explicitly control time, randomness, or another dependency outside its stated integration boundary to make the scenario repeatable.

For `OtpEmailGateway.test.ts`, useful assertions include:

- An actual OTP request passes through the gateway and mailing use case.
- The in-memory mailer records the expected recipient and generated code.
- The received code can be validated by OTP.
- A delivery failure travels back through the adapter's error contract.

For `OtpGateway.test.ts`, tests can verify that email access verification requests and validates actual OTP records rather than accepting a fabricated result.

For `EAVGateway.test.ts`, tests can verify that authn consumes actual email access tokens and rejects reused, mismatched, or invalid tokens.

### 9.3 External adapter tests

Tests intended to verify an external adapter MUST exercise the actual adapter against configured test infrastructure. These tests normally use integrated mode.

They SHOULD use dedicated test resources and lifecycle setup appropriate to the service. They MUST NOT silently fall back to in-memory behavior when the required service is unavailable.

Explicitly skipped tests due to unavailable configured infrastructure MUST remain visibly skipped. They MUST NOT be reported as successful verification of the external adapter.

These tests cover properties that in-memory implementations cannot establish, such as provider error translation, actual queries, service permissions, or persistence behavior.

### 9.4 Contract tests

Where a port has meaningful storage or service semantics, common contract scenarios SHOULD be exercised against both its in-memory implementation and its configured external adapter.

The contract tests can share behavioral assertions while using different setup. Their purpose is to detect observable differences that would otherwise let isolated tests pass while integrated execution fails.

### 9.5 Test helpers and imported modules

Portable test helpers SHOULD live in the owning module, for example:

```text
<module>/__tests__/utils/get<Module>TestContainer.ts
```

A helper MUST NOT depend on a project-global `createTestContainer` function that might not exist in a project importing the module's tests.

A helper SHOULD register providers without eagerly resolving consumers, so tests can apply overrides first. A helper that registers stubs MUST do so explicitly as test setup and document which ports it replaces.

Independent feature helpers need only load their own feature and the shared dependencies actually used by the test. Actual gateway test composition must additionally load the dependency modules that the actual gateway needs.

Helpers MUST NOT be collected as test suites merely because they are inside `__tests__`. Actual test files use the repository's `*.test.ts` naming convention.

This specification does not require separate `diProvider.test.ts` files. Provider composition can be exercised through the behavior tests that resolve the relevant consumers.

## 10. Local computation remains actual

The following behavior MUST remain actual in both modes unless a test explicitly overrides it:

- Password hashes use the implemented algorithm and verification procedure.
- JWTs use the implemented signing, parsing, and signature verification procedures.
- HMACs use the implemented keyed digest and verification procedures.
- UUIDs use the actual generator.
- OTPs use the actual generator.
- The clock reports actual system time.

Neither mode promises fixed outputs. For example, salts and random IDs may differ between calls in isolated mode. Tests that require exact values must explicitly control the appropriate collaborator.

Cryptographic configuration, algorithms, validation rules, and application settings MUST NOT be weakened just because external infrastructure is isolated. Mode selection changes external dependencies, not the meaning of those operations.

## 11. Expected examples

### 11.1 Isolated application flow

1. The application loads providers with `INFRA_MODE=isolated`.
2. Authn stores credentials through an in-memory repository.
3. The password is hashed by the actual hashing engine.
4. Email verification runs through actual EAV, OTP, and mailing adapters.
5. Mailing records a message in memory for local inspection.
6. The actual OTP validation and JWT implementation produce and validate access tokens.

No external service account is required for this flow. No stub is selected by a provider.

### 11.2 Integrated application flow

1. The application loads providers with `INFRA_MODE=integrated`.
2. Authn uses a configured repository adapter.
3. The password is hashed by the same actual hashing engine.
4. Email verification runs through the actual module adapters.
5. Mailing uses its configured external delivery adapter.
6. Missing required service configuration or a service failure is reported explicitly.

### 11.3 Unit test with controlled behavior

1. The test loads the feature's providers.
2. It replaces the consumed gateway port with a stub.
3. It configures the stub to accept or reject a token.
4. It resolves and executes the feature's use case.
5. It checks the feature's behavior without requiring the downstream feature.

### 11.4 Gateway integration test without external services

1. The test loads the participating providers in isolated mode.
2. It keeps the actual gateway and downstream use cases.
3. It keeps the in-memory external service boundary.
4. It explicitly replaces the clock if the scenario needs controlled time.
5. It asserts effects across the actual module boundary.

This is an integration test even though infrastructure mode is isolated.

## 12. Current implementation and integration availability

The current providers default an unset `INFRA_MODE` to `isolated`. Explicit empty strings, unsupported values, different casing, and surrounding whitespace are rejected. Providers validate the mode before registering their bindings.

All shared providers use their actual local engines in both modes. JWT configuration is loaded as follows:

- `JWT_SECRET` supplies the signing secret when present.
- Isolated mode uses the documented local example secret `example-token` only when `JWT_SECRET` is unset.
- Integrated JWT requires a nonempty `JWT_SECRET`.
- An explicitly empty or whitespace-only secret is rejected in either mode.
- Importing applications must replace the example-secret loader with their own signing configuration, as the provider's TODO explains.

Feature providers have the following availability:

| Feature | Isolated implementations | Integrated availability |
| --- | --- | --- |
| `authn` | Actual EAV gateway, memory credential and session repositories, memory event capture | Explicit provider error until external persistence and event-delivery adapters are implemented and configured |
| `emailAccessVerification` | Actual OTP gateway and memory email-access repository | Explicit provider error until an external email-access repository is implemented and configured |
| `otp` | Actual email gateway, cryptographic OTP generator, and memory OTP repository | Explicit provider error until an external OTP repository is implemented and configured |
| `mailing` | Memory mail capture | Explicit provider error until an external delivery adapter is implemented and configured |

No external database or mail-service vendor is selected by these registry examples. Importing applications must implement their chosen service adapters and replace the integrated error branches. An explicit error is intentional; registering a memory adapter in those branches would misrepresent integrated behavior.

Memory mail capture does not deliver mail externally. Memory repositories and event capture are scoped to the container's adapter instances and do not provide durable storage or external event delivery. Their successful tests do not establish external-service correctness.

Tests register controllable collaborators explicitly before resolving consumers. Gateway tests compose participating providers in isolated mode, exercising actual module adapters while keeping external boundaries in memory. No provider chooses a stub as a runtime default.

Registry metadata regeneration and publication remain separate from source changes.

## 13. Compliance criteria

A module complies when all applicable statements below hold:

- Its provider accepts the validated `isolated` or `integrated` mode and reports invalid explicit configuration.
- Actual module gateways and local engines are selected in both modes.
- Isolated service-backed ports use meaningful in-memory implementations without hidden external requirements.
- Integrated service-backed ports use configured actual adapters and do not silently substitute memory adapters.
- Production providers do not select test doubles in either mode.
- Environment and placeholder configuration loaders carry actionable import-customization TODOs.
- Tests register the stubs and value tokens they need before resolving consumers.
- Feature tests can replace gateways to remain independent of downstream features.
- Actual gateway tests exercise participating modules together through their actual boundaries.
- In-memory limitations and unavailable capabilities are documented accurately.
- Imported test helpers do not require a consuming project's private container utility.

A registry-wide implementation satisfies the specification only when these rules hold throughout the participating dependency chains, including their external boundaries.
