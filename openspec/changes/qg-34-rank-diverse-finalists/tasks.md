## 1. Specify behavior first

- [ ] 1.1 Add failing tests for threshold filtering, top-K, stable score ordering and deterministic ties.
- [ ] 1.2 Add failing batch tests for redundant high-score candidates, diversity penalties and fewer-than-K results.

## 2. Implement ranking

- [ ] 2.1 Implement the pure versioned diversity-selection policy, verifying every inclusion/exclusion has a reason.
- [ ] 2.2 Integrate finalist state transitions and result DTOs, verifying no below-threshold or blocked candidate appears.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying repeated inputs return byte-stable finalist ordering.
