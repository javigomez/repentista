## 1. Specify the state machine first

- [ ] 1.1 Add failing transition tests for every state from brief through ranking, including forbidden state skipping.
- [ ] 1.2 Add failing end-to-end application tests with deterministic collaborators for success, empty result, partial top-K and every hard-block stage.
- [ ] 1.3 Add failing tests for retry budgets, V4/V2 backtracking, metric/soft repairs, cancellation and global LLM budget exhaustion.

## 2. Implement orchestration

- [ ] 2.1 Implement discriminated state/branch types and transition policy, verifying TypeScript exhaustiveness prevents unhandled states.
- [ ] 2.2 Implement `GenerateQuatrains` with injected planners, writer, validators, evaluators, repairers, scorer and ranker, verifying the LLM is never asked for a full quatrain.
- [ ] 2.3 Implement audit events, rejected-branch summary and pipeline metrics, verifying finalists and failures are kept in separate result fields.

## 3. Integration and verification

- [ ] 3.1 Add a deterministic golden-flow fixture for the egoísmo example, verifying each intermediate artifact and validator transition rather than matching private reasoning.
- [ ] 3.2 Run `npm test` and `npm run build`, verifying the complete application use case passes without concrete infrastructure.
