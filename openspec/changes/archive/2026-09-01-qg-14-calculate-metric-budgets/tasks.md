## 1. Specify behavior first

- [x] 1.1 Add failing unit tests for aguda/llana fixed endings, V1/V3 without fixed endings and exact/heuristic fields.
- [x] 1.2 Add failing tests for unsupported or low-confidence word analysis and prohibited-license assumptions.

## 2. Implement budgeting

- [x] 2.1 Implement pure budget value objects and calculation from target/stress data, verifying exact values are distinguished from hints.
- [x] 2.2 Integrate budgets into per-slot planning DTOs, verifying no budget can mark a verse valid.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying calculations and uncertainty are stable.
