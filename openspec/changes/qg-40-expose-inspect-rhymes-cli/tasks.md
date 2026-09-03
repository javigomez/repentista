## 1. Specify CLI behavior first

- [x] 1.1 Add failing acceptance tests for known words, family output, category/role filters and stable candidate ordering.
- [x] 1.2 Add failing tests for empty family, unknown word, unavailable version, doubtful analysis and no-provider execution.

## 2. Implement the query adapter

- [ ] 2.1 Implement the inspect-rhymes query use case over dictionary, word analysis and catalog, verifying candidates and exclusions are both returned.
- [ ] 2.2 Implement CLI parsing, JSON rendering and exit mapping, verifying no generation or LLM dependency is reachable.

## 3. Wire and verify

- [ ] 3.1 Register `inspect-rhymes` in the shared entrypoint, verifying its help and invocation contract are stable.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying all rhyme-inspection acceptance tests pass offline.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
