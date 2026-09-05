## 1. Demonstrate the missing boundary

- [x] 1.1 Add a focused architecture test that fails against the duplicated rhyme-family calculation, verifying its diagnostic names the offending consumer and owner boundary.
- [x] 1.2 Add adversarial consumer fixtures using a catalog double whose approved family contradicts orthographic similarity, verifying bypassing the double fails.

## 2. Enforce ownership

- [x] 2.1 Extend the shared architecture-rule utilities with an explicit linguistic-owner rule, verifying allowed catalog internals pass and dependency inversions fail.
- [x] 2.2 Apply the rule to application, CLI and validator consumers, verifying local family derivation and catalog reconstruction are rejected without blocking unrelated text processing.
- [ ] 2.3 Add validation for narrowly documented exceptions, verifying broad directory exclusions and undocumented exemptions fail.

## 3. Integrate and document

- [ ] 3.1 Document the owner map and exception-removal convention in the testing guide, verifying the architecture test points maintainers to that guidance.
- [ ] 3.2 Run the architecture family, `npm test` and `npm run build`, verifying QG-41-compliant consumers pass and the full suite remains offline.
