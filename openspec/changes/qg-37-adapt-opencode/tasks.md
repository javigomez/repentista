## 1. Verify documentation and specify contracts

- [x] 1.1 Recheck current OpenCode server/OpenAPI/TypeScript SDK documentation and pin a compatible version, verifying session and prompt APIs before coding.
- [x] 1.2 Add failing shared-port contract tests with a fake OpenCode client for session creation, prompt completion, JSON extraction and provenance.
- [x] 1.3 Add failing tests for server unavailable, timeout, cancellation, malformed JSON, model error and cross-session contamination.

## 2. Implement the adapter

- [x] 2.1 Implement client/server configuration and per-branch session isolation, verifying no TUI output scraping is used.
- [ ] 2.2 Implement prompt submission, local schema validation and normalized error mapping, verifying the same port tests as OpenAI pass.

## 3. Verify

- [ ] 3.1 Add an opt-in headless-server contract test with controlled configuration, verifying default tests remain offline.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying OpenCode dependencies stay inside infrastructure.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
