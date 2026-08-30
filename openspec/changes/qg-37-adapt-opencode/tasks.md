## 1. Verify documentation and specify contracts

- [ ] 1.1 Recheck current OpenCode server/OpenAPI/TypeScript SDK documentation and pin a compatible version, verifying session and prompt APIs before coding.
- [ ] 1.2 Add failing shared-port contract tests with a fake OpenCode client for session creation, prompt completion, JSON extraction and provenance.
- [ ] 1.3 Add failing tests for server unavailable, timeout, cancellation, malformed JSON, model error and cross-session contamination.

## 2. Implement the adapter

- [ ] 2.1 Implement client/server configuration and per-branch session isolation, verifying no TUI output scraping is used.
- [ ] 2.2 Implement prompt submission, local schema validation and normalized error mapping, verifying the same port tests as OpenAI pass.

## 3. Verify

- [ ] 3.1 Add an opt-in headless-server contract test with controlled configuration, verifying default tests remain offline.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying OpenCode dependencies stay inside infrastructure.
