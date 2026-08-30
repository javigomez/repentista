## 1. Specify behavior first

- [ ] 1.1 Add failing tests for too-short/too-long diagnostics, preserved role/final/anchors and successful revalidation.
- [ ] 1.2 Add failing tests for changed final words, semantic drift flags, false LLM validity claims and exhausted attempts.

## 2. Implement repair

- [ ] 2.1 Implement repair request/result contracts and versioned prompt, verifying only one slot is editable.
- [ ] 2.2 Implement branch revisions, cheap invariant checks and hard revalidation, verifying original history remains intact.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying every accepted repair has a fresh valid scansion.
