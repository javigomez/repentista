## 1. Verify dependency and specify contracts

- [x] 1.1 Verify the current `weiwei/silabacion` README, package API, MIT license and chosen exact version, recording the evidence in dependency metadata.
- [x] 1.2 Add failing contract tests from the gold corpus for syllables, stress, aguda/llana, diptongos, hiatos, unsupported and inconsistent results.

## 2. Implement the adapter

- [x] 2.1 Add the pinned dependency and implement the `WordAnalysisPort` translation, verifying only infrastructure imports the package.
- [ ] 2.2 Add invariant checks and normalized errors, verifying unsupported/esdrújula cases never return trusted analysis.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying dependency contract and architecture tests pass.
