## 1. Specify the state machine first

- [x] 1.1 Add failing transition tests for every state from brief through ranking, including forbidden state skipping.
- [x] 1.2 Add failing end-to-end application tests with deterministic collaborators for success, empty result, partial top-K and every hard-block stage.
- [x] 1.3 Add failing tests for retry budgets, V4/V2 backtracking, metric/soft repairs, cancellation and global LLM budget exhaustion.

## 2. Implement orchestration

- [x] 2.1 Implement discriminated state/branch types and transition policy, verifying TypeScript exhaustiveness prevents unhandled states.
- [x] 2.2 Implement `GenerateQuatrains` with injected planners, writer, validators, evaluators, repairers, scorer and ranker, verifying the LLM is never asked for a full quatrain.
- [x] 2.3 Implement audit events, rejected-branch summary and pipeline metrics, verifying finalists and failures are kept in separate result fields.

## 3. Integration and verification

- [x] 3.1 Add a deterministic golden-flow fixture for the egoísmo example, verifying each intermediate artifact and validator transition rather than matching private reasoning.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying the complete application use case passes without concrete infrastructure.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
