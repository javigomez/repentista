## 1. Specify behavior first

- [ ] 1.1 Add failing gold tests for consonant families including `-ón`, `-uego`, `-ado` and pairs that are only assonant.
- [ ] 1.2 Add failing tests for role/category filters, empty results and inconsistent editorial family data.

## 2. Implement the catalog

- [ ] 2.1 Implement phonetic-tail and family value objects with the initial versioned dialect policy, verifying stable equality.
- [ ] 2.2 Build the immutable per-dictionary index and filtered queries, verifying no pending or invented word appears.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying catalog results and explanations match fixtures.
