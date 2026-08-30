## 1. Specify behavior first

- [ ] 1.1 Add failing paired fixtures with equal metric but fluent/trabado delivery and expected diagnostic points.
- [ ] 1.2 Add failing tests for metric preconditions, allowed profile labels and non-blocking output.

## 2. Implement the evaluator

- [ ] 2.1 Implement cantability DTO/rubric using existing scansion as input, verifying the LLM is never asked to recount.
- [ ] 2.2 Integrate per-verse and aggregate results, verifying profiles remain descriptive rather than mandatory.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying cantability remains separate from metric and naturalness.
