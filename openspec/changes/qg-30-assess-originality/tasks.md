## 1. Specify behavior first

- [x] 1.1 Add failing batch fixtures for distinct candidates, exact duplicates already removed and semantic variations of the same joke.
- [x] 1.2 Add failing tests for neighbor evidence, batch-scoped claims and stable similarity results.

## 2. Implement the evaluator

- [x] 2.1 Implement structured feature extraction and candidate-neighbor preselection, verifying cost avoids all-pairs LLM calls where possible.
- [x] 2.2 Implement originality assessment and per-candidate relationships, verifying no global novelty claim is emitted.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying batch originality fixtures and deterministic ordering pass.
