## 1. Specify behavior first

- [ ] 1.1 Add failing gold tests for consonant V2/V4 pairs, assonant false positives and orthographically misleading endings.
- [ ] 1.2 Add failing tests for unknown/doubtful final analysis and accidental V1/V3 rhyme.

## 2. Implement the validator

- [ ] 2.1 Implement final-word family comparison over phonetic value objects, verifying no suffix-string shortcut exists.
- [ ] 2.2 Integrate detailed family/version diagnostics into candidate validation, verifying only V2↔V4 is required.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying consonance and non-supported assonance cases pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
