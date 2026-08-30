## 1. Specify behavior first

- [ ] 1.1 Add failing diverse anchor tests for surprise, image, absurdity, unclear oddity and no observable mechanism.
- [ ] 1.2 Add failing tests for safety precondition, evidence requirements, score range and provenance.

## 2. Implement the evaluator

- [ ] 2.1 Implement humor-specific rubric/prompt and structured output validation, verifying rejected evidence cannot yield a score.
- [ ] 2.2 Integrate non-blocking results after safety, verifying no candidate approval state is introduced.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying humor tests pass with deterministic fixtures.
