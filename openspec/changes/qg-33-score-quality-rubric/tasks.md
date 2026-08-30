## 1. Specify behavior first

- [ ] 1.1 Add failing tests for valid weighted totals, per-dimension breakdown and deterministic rounding.
- [ ] 1.2 Add failing tests for hard-invalid/doubtful candidates, missing dimensions, low confidence, invalid weights and version changes.

## 2. Implement scoring

- [ ] 2.1 Implement versioned rubric value objects and pure aggregation, verifying weights total 100 and no LLM is called.
- [ ] 2.2 Integrate score transitions/provenance into candidates, verifying invalid states cannot receive a total.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying rubric fixtures and arithmetic edges pass.
