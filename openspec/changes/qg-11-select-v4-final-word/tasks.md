## 1. Specify behavior first

- [ ] 1.1 Add failing tests for filtering approved remate words and accepting a selected candidate from the closed list.
- [ ] 1.2 Add failing tests for invented selections, empty candidate sets, unsupported stress and no viable rhyme family.

## 2. Implement selection

- [ ] 2.1 Implement deterministic candidate filtering over dictionary/catalog, verifying every exclusion has a reason.
- [ ] 2.2 Implement LLM prioritization by candidate ID and preserve alternatives, verifying no free-text word enters the result.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying semantic selection and domain boundaries pass.
