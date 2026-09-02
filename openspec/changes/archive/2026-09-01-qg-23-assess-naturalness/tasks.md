## 1. Specify behavior first

- [x] 1.1 Add failing tests with approved and unnatural anchor examples, verifying note, evidence, confidence and provenance fields.
- [x] 1.2 Add failing tests for invalid candidate precondition, out-of-range scores, missing citations and malformed LLM output.

## 2. Implement the evaluator

- [x] 2.1 Implement the versioned naturalness rubric/prompt and schema validator, verifying the deterministic fake drives all branches.
- [x] 2.2 Attach results without changing hard validation or text, verifying candidate transition tests enforce separation.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying naturalness fixtures pass offline.
