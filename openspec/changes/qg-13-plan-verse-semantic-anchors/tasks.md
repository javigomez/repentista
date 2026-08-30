## 1. Specify behavior first

- [ ] 1.1 Add failing tests for role-specific anchors that share a scene and preserve V2/V4 final words.
- [ ] 1.2 Add failing tests for isolated ideas, contradictory anchors, verse-like text and missing roles.

## 2. Implement anchor planning

- [ ] 2.1 Define anchor contracts and validators, verifying only structured semantic material is accepted.
- [ ] 2.2 Implement the versioned LLM planner, verifying plan and fixed-word references remain traceable.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying all role and unity fixtures pass.
