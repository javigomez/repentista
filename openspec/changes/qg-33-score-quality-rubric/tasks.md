## 1. Specify behavior first

- [ ] 1.1 Add failing tests for valid weighted totals, per-dimension breakdown and deterministic rounding.
- [ ] 1.2 Add failing tests for hard-invalid/doubtful candidates, missing dimensions, low confidence, invalid weights and version changes.

## 2. Implement scoring

- [ ] 2.1 Implement versioned rubric value objects and pure aggregation, verifying weights total 100 and no LLM is called.
- [ ] 2.2 Integrate score transitions/provenance into candidates, verifying invalid states cannot receive a total.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying rubric fixtures and arithmetic edges pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
