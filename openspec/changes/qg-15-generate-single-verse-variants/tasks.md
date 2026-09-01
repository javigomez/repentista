## 1. Specify behavior first

- [x] 1.1 Add failing tests for V1–V4 requests, batch size, identity and provenance using the LLM fake.
- [x] 1.2 Add failing tests for monolithic quatrains, changed final words, wrong roles, extra text and retry exhaustion.

## 2. Implement the writer

- [x] 2.1 Define common verse-draft contracts and role-specific prompt templates, verifying schema validation rejects invalid output.
- [x] 2.2 Implement variant generation and cheap fixed-ending checks, verifying drafts remain pending hard validation.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying the writer never certifies or emits multiple slots per operation.
