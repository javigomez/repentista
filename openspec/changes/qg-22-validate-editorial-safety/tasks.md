## 1. Specify behavior first

- [x] 1.1 Create versioned positive, blocking and doubtful editorial-policy fixtures appropriate to the initial audience.
- [x] 1.2 Add failing tests for exact rules, localized evidence, polysemy and explicit `DUDOSO` handling.

## 2. Implement the validator

- [x] 2.1 Implement deterministic policy loading and matchers, verifying the domain never calls remote moderation or an LLM.
- [x] 2.2 Integrate exhaustive safety diagnostics into candidate blocking transitions, verifying policy version is recorded.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying safety fixtures and no-network execution pass.
