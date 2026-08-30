## 1. Specify behavior first

- [x] 1.1 Add failing tests for complete entries, normalization, aguda/llana constraints and preparation/remate permissions.
- [x] 1.2 Add failing repository-contract tests for approved, pending, missing and unavailable-version queries.

## 2. Implement the dictionary domain

- [ ] 2.1 Implement entry value objects and factories, verifying invalid or duplicate forms are rejected with field errors.
- [ ] 2.2 Define the immutable versioned dictionary port and in-memory test implementation, verifying snapshot isolation.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying dictionary behavior and architecture boundaries pass.
