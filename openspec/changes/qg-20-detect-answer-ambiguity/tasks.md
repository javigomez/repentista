## 1. Specify behavior first

- [ ] 1.1 Add failing fixtures for unique answer, multiple declared answers, deterministic exclusions and unresolved alternatives.
- [ ] 1.2 Add failing tests proving the result is relative to an explicit dictionary version and never depends on LLM judgment.

## 2. Implement the validator

- [ ] 2.1 Implement complete family enumeration and typed filters, verifying every catalog word is accepted or excluded with reason.
- [ ] 2.2 Implement conservative `VALIDO/INVALIDO/DUDOSO` policy and candidate diagnostics, verifying unresolved semantics cannot advance.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying alternative lists are stable and exhaustive for fixtures.
