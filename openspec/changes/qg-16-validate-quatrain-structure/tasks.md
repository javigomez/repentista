## 1. Specify behavior first

- [ ] 1.1 Add failing tests for exactly four ordered roles, non-empty text and fixed `0-A-0-A` scheme.
- [ ] 1.2 Add failing tests for missing/extra slots, role order, punctuation-terminal handling and changed V2/V4 endings.

## 2. Implement the validator

- [ ] 2.1 Implement pure structural checks returning exhaustive typed violations, verifying no linguistic dependency is imported.
- [ ] 2.2 Integrate the result into candidate transitions, verifying only `VALIDO` unlocks later hard validators.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying all structural fixtures pass.
