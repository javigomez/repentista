## 1. Specify behavior first

- [ ] 1.1 Add failing tests for role-specific anchors that share a scene and preserve V2/V4 final words.
- [ ] 1.2 Add failing tests for isolated ideas, contradictory anchors, verse-like text and missing roles.

## 2. Implement anchor planning

- [ ] 2.1 Define anchor contracts and validators, verifying only structured semantic material is accepted.
- [ ] 2.2 Implement the versioned LLM planner, verifying plan and fixed-word references remain traceable.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying all role and unity fixtures pass.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.
