## 1. Specify behavior first

- [x] 1.1 Add failing tests for one-dimension repair scopes, immutable slots and preserved hard constraints.
- [x] 1.2 Add failing tests for multi-defect requests, out-of-scope changes, hard-regression rejection and no-improvement outcomes.

## 2. Implement repair

- [x] 2.1 Implement common constrained-repair DTOs and dimension-specific prompts, verifying all edit permissions are explicit.
- [x] 2.2 Implement child-branch creation, hard revalidation and target reevaluation, verifying original and repaired candidates remain comparable.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying repair limits and audit history pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
