## 1. Specify behavior first

- [ ] 1.1 Add failing contract tests for schema-valid success, invalid structured output and normalized provenance.
- [ ] 1.2 Add failing tests for timeout, cancellation, authentication, rate limit, rejection and unavailable errors.

## 2. Implement the port and fake

- [ ] 2.1 Define provider-neutral request, response and error types, verifying no SDK type appears in public declarations.
- [ ] 2.2 Implement local schema validation and a deterministic fixture-driven fake, verifying sequential successes and failures are reproducible.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying the shared port contract is ready for multiple adapters.
