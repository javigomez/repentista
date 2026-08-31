## 1. Specify behavior first

- [x] 1.1 Add failing tests for a valid semantic plan and preservation of prompt/model provenance using the deterministic LLM fake.
- [x] 1.2 Add failing tests for missing fields, embedded verses, premature rhyme words and exhausted retries.

## 2. Implement planning

- [x] 2.1 Define the plan DTO/value objects and output validator, verifying invalid LLM data cannot create a plan.
- [x] 2.2 Implement the application planner and versioned prompt, verifying exactly one state operation is requested per call.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying planning remains independent of concrete providers.
