## 1. Specify behavior first

- [x] 1.1 Add failing fixtures for unique answer, multiple declared answers, deterministic exclusions and unresolved alternatives.
- [x] 1.2 Add failing tests proving the result is relative to an explicit dictionary version and never depends on LLM judgment.

## 2. Implement the validator

- [x] 2.1 Implement complete family enumeration and typed filters, verifying every catalog word is accepted or excluded with reason.
- [x] 2.2 Implement conservative `VALIDO/INVALIDO/DUDOSO` policy and candidate diagnostics, verifying unresolved semantics cannot advance.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying alternative lists are stable and exhaustive for fixtures.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
