## 1. Specify CLI behavior first

- [ ] 1.1 Add failing acceptance tests for arguments/file context, defaults, provider selection and JSON finalist output using fake adapters.
- [ ] 1.2 Add failing tests for invalid input, empty/partial results, operational failures, stdout/stderr separation and exit codes.

## 2. Implement the input adapter

- [ ] 2.1 Implement `generate` parsing and translation to `GenerationBrief`, verifying no domain rule is duplicated in CLI code.
- [ ] 2.2 Implement the composition root for dictionary, provider adapter and `GenerateQuatrains`, verifying provider selection is confined to infrastructure.
- [ ] 2.3 Implement stable JSON rendering and diagnostics, verifying secrets/prompts are omitted according to output policy.

## 3. Wire and verify

- [ ] 3.1 Register the CLI entrypoint/command in `package.json`, verifying an installed/build invocation reaches the adapter.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying all CLI acceptance and architecture tests pass.
