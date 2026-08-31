## 1. Specify behavior first

- [x] 1.1 Add failing tests for consonant-family, role, category and morphological-policy filtering.
- [x] 1.2 Add failing tests for assonant/out-of-list choices, no viable pair and deterministic alternatives.

## 2. Implement selection

- [x] 2.1 Implement catalog-based pair filtering with full exclusion diagnostics, verifying only approved V2 words survive.
- [ ] 2.2 Implement LLM ordering by stable IDs and typed failure, verifying it never writes a verse or expands the list.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying V2 selection supports backtracking data.
