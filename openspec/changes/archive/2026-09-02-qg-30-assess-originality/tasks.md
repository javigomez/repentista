## 1. Specify behavior first

- [x] 1.1 Add failing batch fixtures for distinct candidates, exact duplicates already removed and semantic variations of the same joke.
- [x] 1.2 Add failing tests for neighbor evidence, batch-scoped claims and stable similarity results.

## 2. Implement the evaluator

- [x] 2.1 Implement structured feature extraction and candidate-neighbor preselection, verifying cost avoids all-pairs LLM calls where possible.
- [x] 2.2 Implement originality assessment and per-candidate relationships, verifying no global novelty claim is emitted.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying batch originality fixtures and deterministic ordering pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
