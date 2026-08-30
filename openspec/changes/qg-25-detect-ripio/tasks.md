## 1. Specify behavior first

- [ ] 1.1 Add failing fixtures for natural rhyme, obvious filler, forced causality, morphological repetition and intentional absurdity.
- [ ] 1.2 Add failing tests for pattern IDs, LLM evidence, severity and malformed subjective responses.

## 2. Implement the detector

- [ ] 2.1 Implement versioned deterministic patterns and evidence collection, verifying each match is localized.
- [ ] 2.2 Implement the ripio-specific LLM assessment and merge policy, verifying it cannot alter rhyme validity.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying positive/negative ripio anchors pass.
