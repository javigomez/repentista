## 1. Specify the regression first

- [x] 1.1 Add failing acceptance tests with orthographically similar words that the approved catalog deliberately separates, verifying `inspect-rhymes` never invents candidates.
- [x] 1.2 Add failing tests for analysis/catalog inconsistency and excluded doubtful members, verifying both keys and exclusion evidence are preserved.
- [ ] 1.3 Add a catalog spy to the inspection fixtures and verify a successful query proves that the catalog API was called with the requested version and filters.

## 2. Delegate to the approved catalog

- [ ] 2.1 Extend the catalog query DTO only where required for diagnostic evidence, verifying its focused unit tests preserve stable ordering and complete exclusions.
- [ ] 2.2 Replace dictionary enumeration and local family extraction in the inspection use case with the catalog dependency, verifying the regression and acceptance tests pass.
- [ ] 2.3 Remove the duplicated family-key helpers and adapt CLI composition/output, verifying compatibility tests and explicit inconsistency exit handling.

## 3. Verify conformance

- [ ] 3.1 Review the final diff against QG-40 and this change's proposal, design and spec, recording a requirement-to-test-to-module checklist in the implementation summary.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying the complete suite passes offline and no LLM dependency is reachable.
