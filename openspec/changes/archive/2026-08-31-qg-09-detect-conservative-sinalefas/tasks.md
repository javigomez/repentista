## 1. Specify behavior first

- [x] 1.1 Add failing fixtures for natural, blocked and doubtful vowel boundaries with punctuation and offsets.
- [x] 1.2 Add failing tests proving diéresis, sinéresis and forced hiatus are never introduced.

## 2. Implement the detector

- [x] 2.1 Implement token-boundary analysis and ordered versioned rules, verifying every result carries evidence.
- [x] 2.2 Implement confidence aggregation for multiple boundaries, verifying any necessary doubtful join remains explicit.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying all conservative-policy fixtures pass.
