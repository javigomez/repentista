## 1. Specify CLI behavior first

- [ ] 1.1 Add failing acceptance tests for candidate input by file/stdin and complete valid JSON diagnostics.
- [ ] 1.2 Add failing tests for malformed contracts, multiple validator failures, omitted dependent checks, no credentials and exit codes.

## 2. Implement the diagnostic adapter

- [ ] 2.1 Implement candidate parsing through domain factories and the validation diagnostic use case, verifying all eligible hard validators are reused.
- [ ] 2.2 Implement JSON report/stdout, diagnostics/stderr and exit mapping, verifying the command never resolves an LLM adapter.

## 3. Wire and verify

- [ ] 3.1 Register `validate-candidate` in the shared CLI entrypoint, verifying it composes only deterministic collaborators.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying offline acceptance tests pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
