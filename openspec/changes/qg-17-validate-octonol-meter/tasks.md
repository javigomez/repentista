## 1. Specify behavior first

- [ ] 1.1 Build a reviewed gold fixture set for valid/invalid agudas, llanas, natural/doubtful sinalefas and prohibited licenses.
- [ ] 1.2 Add failing tests for exact positions, trace fields, confidence and `VALIDO/DUDOSO/INVALIDO` classification.

## 2. Implement the validator

- [ ] 2.1 Implement tokenization, word-analysis composition, last-stress location and conservative count, verifying unit stages independently.
- [ ] 2.2 Produce full scansion diagnostics and candidate integration, verifying a doubtful join can never yield `VALIDO`.

## 3. Verify

- [ ] 3.1 Run `npm test` and `npm run build`, verifying the complete metric gold set passes without LLM or network.
