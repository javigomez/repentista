## 1. Specify behavior first

- [ ] 1.1 Add failing tests for V1–V4 requests, batch size, identity and provenance using the LLM fake.
- [ ] 1.2 Add failing tests for monolithic quatrains, changed final words, wrong roles, extra text and retry exhaustion.

## 2. Implement the writer

- [ ] 2.1 Define common verse-draft contracts and role-specific prompt templates, verifying schema validation rejects invalid output.
- [ ] 2.2 Implement variant generation and cheap fixed-ending checks, verifying drafts remain pending hard validation.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying the writer never certifies or emits multiple slots per operation.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
