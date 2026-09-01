## 1. Specify behavior first

- [ ] 1.1 Add failing paired fixtures with equal metric but fluent/trabado delivery and expected diagnostic points.
- [ ] 1.2 Add failing tests for metric preconditions, allowed profile labels and non-blocking output.

## 2. Implement the evaluator

- [ ] 2.1 Implement cantability DTO/rubric using existing scansion as input, verifying the LLM is never asked to recount.
- [ ] 2.2 Integrate per-verse and aggregate results, verifying profiles remain descriptive rather than mandatory.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying cantability remains separate from metric and naturalness.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
