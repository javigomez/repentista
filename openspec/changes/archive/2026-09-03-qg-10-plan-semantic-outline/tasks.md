## 1. Specify behavior first

- [x] 1.1 Add failing tests for a valid semantic plan and preservation of prompt/model provenance using the deterministic LLM fake.
- [x] 1.2 Add failing tests for missing fields, embedded verses, premature rhyme words and exhausted retries.

## 2. Implement planning

- [x] 2.1 Define the plan DTO/value objects and output validator, verifying invalid LLM data cannot create a plan.
- [x] 2.2 Implement the application planner and versioned prompt, verifying exactly one state operation is requested per call.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying planning remains independent of concrete providers.

## Refactor conventions for implementation

- Keep the tests-first cycle, and place tests for independent responsibilities in dedicated `*.test.ts` files with nested `describe` blocks and `it` cases.
- Put repeated deterministic data in `test-fixtures.ts` or a capability-specific fixture module. Fixture constructors must return fresh values by default and make overrides explicit.
- Import application capabilities from their concrete module paths. Do not edit `src/application/index.ts` from a feature branch merely to expose an internal dependency; public barrel changes belong in a dedicated integration change.
- When a discriminated result is expected to succeed, assert or throw on failure; never hide a failed assertion with `if (!result.ok) return` or an equivalent silent branch.

