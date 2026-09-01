## 1. Specify behavior first

- [x] 1.1 Add failing anchor tests for coherent progression, broken referents, missing causality and isolated verses.
- [x] 1.2 Add failing tests for required transition evidence and separation from humor/remate scores.

## 2. Implement the evaluator

- [x] 2.1 Implement coherence-specific prompt, DTO and validation, verifying each V1→V4 transition is represented.
- [x] 2.2 Integrate traceable results into eligible candidates, verifying invalid candidates never trigger the port.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying coherence examples remain deterministic with the fake.
