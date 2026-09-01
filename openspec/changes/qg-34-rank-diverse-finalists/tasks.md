## 1. Specify behavior first

- [ ] 1.1 Add failing tests for threshold filtering, top-K, stable score ordering and deterministic ties.
- [ ] 1.2 Add failing batch tests for redundant high-score candidates, diversity penalties and fewer-than-K results.

## 2. Implement ranking

- [ ] 2.1 Implement the pure versioned diversity-selection policy, verifying every inclusion/exclusion has a reason.
- [ ] 2.2 Integrate finalist state transitions and result DTOs, verifying no below-threshold or blocked candidate appears.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying repeated inputs return byte-stable finalist ordering.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
