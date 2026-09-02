## 1. Specify behavior first

- [ ] 1.1 Add failing tests for too-short/too-long diagnostics, preserved role/final/anchors and successful revalidation.
- [ ] 1.2 Add failing tests for changed final words, semantic drift flags, false LLM validity claims and exhausted attempts.

## 2. Implement repair

- [ ] 2.1 Implement repair request/result contracts and versioned prompt, verifying only one slot is editable.
- [ ] 2.2 Implement branch revisions, cheap invariant checks and hard revalidation, verifying original history remains intact.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying every accepted repair has a fresh valid scansion.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
