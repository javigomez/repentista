## 1. Specify behavior first

- [ ] 1.1 Add failing gold tests for consonant families including `-ón`, `-uego`, `-ado` and pairs that are only assonant.
- [ ] 1.2 Add failing tests for role/category filters, empty results and inconsistent editorial family data.

## 2. Implement the catalog

- [ ] 2.1 Implement phonetic-tail and family value objects with the initial versioned dialect policy, verifying stable equality.
- [ ] 2.2 Build the immutable per-dictionary index and filtered queries, verifying no pending or invented word appears.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying catalog results and explanations match fixtures.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
