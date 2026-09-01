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

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
