## 1. Specify CLI behavior first

- [ ] 1.1 Add failing acceptance tests for known words, family output, category/role filters and stable candidate ordering.
- [ ] 1.2 Add failing tests for empty family, unknown word, unavailable version, doubtful analysis and no-provider execution.

## 2. Implement the query adapter

- [ ] 2.1 Implement the inspect-rhymes query use case over dictionary, word analysis and catalog, verifying candidates and exclusions are both returned.
- [ ] 2.2 Implement CLI parsing, JSON rendering and exit mapping, verifying no generation or LLM dependency is reachable.

## 3. Wire and verify

- [ ] 3.1 Register `inspect-rhymes` in the shared entrypoint, verifying its help and invocation contract are stable.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying all rhyme-inspection acceptance tests pass offline.
