## 1. Specify behavior first

- [x] 1.1 Add failing tests for exactly four ordered roles, non-empty text and fixed `0-A-0-A` scheme.
- [x] 1.2 Add failing tests for missing/extra slots, role order, punctuation-terminal handling and changed V2/V4 endings.

## 2. Implement the validator

- [x] 2.1 Implement pure structural checks returning exhaustive typed violations, verifying no linguistic dependency is imported.
- [x] 2.2 Integrate the result into candidate transitions, verifying only `VALIDO` unlocks later hard validators.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying all structural fixtures pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
