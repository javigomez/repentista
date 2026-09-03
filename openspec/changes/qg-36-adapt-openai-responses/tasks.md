## 1. Verify documentation and specify contracts

- [x] 1.1 Recheck the official Responses and Structured Outputs documentation and chosen SDK version, verifying request/response fields used by the adapter are current.
- [x] 1.2 Add failing shared-port contract tests using a simulated OpenAI client for valid JSON schema output, incomplete response and invalid local schema.
- [x] 1.3 Add failing tests for missing credentials, timeout, cancellation, authentication, rate limit, refusal and secret-safe diagnostics.

## 2. Implement the adapter

- [x] 2.1 Add the pinned official SDK in infrastructure and translate port requests to Responses, verifying no SDK type crosses the adapter boundary.
- [ ] 2.2 Implement structured-output extraction, local validation, usage/provenance and error mapping, verifying all simulated contracts pass.

## 3. Verify

- [ ] 3.1 Add an opt-in live contract test guarded by credentials, verifying it never runs in the default offline suite.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying the normal suite passes without network or API key.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
