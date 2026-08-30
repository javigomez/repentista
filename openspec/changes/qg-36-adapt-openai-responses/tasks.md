## 1. Verify documentation and specify contracts

- [ ] 1.1 Recheck the official Responses and Structured Outputs documentation and chosen SDK version, verifying request/response fields used by the adapter are current.
- [ ] 1.2 Add failing shared-port contract tests using a simulated OpenAI client for valid JSON schema output, incomplete response and invalid local schema.
- [ ] 1.3 Add failing tests for missing credentials, timeout, cancellation, authentication, rate limit, refusal and secret-safe diagnostics.

## 2. Implement the adapter

- [ ] 2.1 Add the pinned official SDK in infrastructure and translate port requests to Responses, verifying no SDK type crosses the adapter boundary.
- [ ] 2.2 Implement structured-output extraction, local validation, usage/provenance and error mapping, verifying all simulated contracts pass.

## 3. Verify

- [ ] 3.1 Add an opt-in live contract test guarded by credentials, verifying it never runs in the default offline suite.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying the normal suite passes without network or API key.
