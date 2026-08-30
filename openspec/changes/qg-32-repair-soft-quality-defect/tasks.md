## 1. Specify behavior first

- [ ] 1.1 Add failing tests for one-dimension repair scopes, immutable slots and preserved hard constraints.
- [ ] 1.2 Add failing tests for multi-defect requests, out-of-scope changes, hard-regression rejection and no-improvement outcomes.

## 2. Implement repair

- [ ] 2.1 Implement common constrained-repair DTOs and dimension-specific prompts, verifying all edit permissions are explicit.
- [ ] 2.2 Implement child-branch creation, hard revalidation and target reevaluation, verifying original and repaired candidates remain comparable.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying repair limits and audit history pass.
