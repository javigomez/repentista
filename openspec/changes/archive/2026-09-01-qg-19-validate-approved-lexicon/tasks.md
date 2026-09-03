## 1. Specify behavior first

- [x] 1.1 Add failing tests for approved V2/V4 words and controlled anchors with correct role permissions.
- [x] 1.2 Add failing tests for missing, pending, wrong-role, duplicate and unavailable-version cases with exhaustive diagnostics.

## 2. Implement the validator

- [x] 2.1 Implement pure orchestration over the dictionary port and controlled-token metadata, verifying functional words are not overvalidated.
- [x] 2.2 Map repository failures separately from linguistic invalidity, verifying candidate states remain trustworthy.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying all lexical fixtures and architecture checks pass.
