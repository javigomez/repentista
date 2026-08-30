## 1. Specify behavior first

- [ ] 1.1 Create versioned positive, blocking and doubtful editorial-policy fixtures appropriate to the initial audience.
- [ ] 1.2 Add failing tests for exact rules, localized evidence, polysemy and explicit `DUDOSO` handling.

## 2. Implement the validator

- [ ] 2.1 Implement deterministic policy loading and matchers, verifying the domain never calls remote moderation or an LLM.
- [ ] 2.2 Integrate exhaustive safety diagnostics into candidate blocking transitions, verifying policy version is recorded.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying safety fixtures and no-network execution pass.
