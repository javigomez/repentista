## 1. Specify behavior first

- [ ] 1.1 Add failing gold tests for consonant V2/V4 pairs, assonant false positives and orthographically misleading endings.
- [ ] 1.2 Add failing tests for unknown/doubtful final analysis and accidental V1/V3 rhyme.

## 2. Implement the validator

- [ ] 2.1 Implement final-word family comparison over phonetic value objects, verifying no suffix-string shortcut exists.
- [ ] 2.2 Integrate detailed family/version diagnostics into candidate validation, verifying only V2↔V4 is required.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying consonance and non-supported assonance cases pass.
