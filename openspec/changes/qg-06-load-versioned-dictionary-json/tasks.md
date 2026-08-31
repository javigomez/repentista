## 1. Specify behavior first

- [x] 1.1 Add failing adapter tests for valid manifest/snapshot loading and exact version selection.
- [x] 1.2 Add failing tests for missing files, malformed JSON, duplicate versions, schema errors and atomic rejection of one bad entry.

## 2. Implement the adapter

- [ ] 2.1 Implement DTO/schema parsing and translation through domain factories, verifying no partial snapshot is exposed.
- [ ] 2.2 Implement filesystem/text-reader injection and fixture snapshots, verifying tests use controlled temporary data.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying JSON diagnostics and ESM imports are stable.
