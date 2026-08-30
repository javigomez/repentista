## 1. Specify behavior first

- [ ] 1.1 Add failing tests for case/space/punctuation-equivalent candidates and stable canonical selection.
- [ ] 1.2 Add failing tests ensuring semantically or textually distinct variants are not collapsed by normalization.

## 2. Implement deduplication

- [ ] 2.1 Implement versioned canonicalization and signatures, verifying deterministic grouping across runs.
- [ ] 2.2 Mark duplicate candidate transitions without deleting history, verifying canonical links serialize correctly.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying batch groups and survivor counts match fixtures.
