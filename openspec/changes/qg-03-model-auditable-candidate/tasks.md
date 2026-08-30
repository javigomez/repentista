## 1. Specify behavior first

- [x] 1.1 Add failing tests for four verse slots, roles, provenance and initial state, verifying incomplete aggregates cannot be created.
- [ ] 1.2 Add failing transition-table tests for allowed and forbidden state changes, rejection evidence and immutable repair history.

## 2. Implement the aggregate

- [ ] 2.1 Implement candidate value objects, events and typed transitions, verifying all lifecycle tests pass.
- [ ] 2.2 Add deterministic ID/clock collaborators and snapshot serialization, verifying fixed doubles produce stable snapshots.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying candidate tests and strict exhaustiveness checks pass.
