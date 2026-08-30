## 1. Specify behavior first

- [x] 1.1 Add failing unit tests for valid normalization, defaults and immutability, verifying they fail before `GenerationBrief` exists.
- [x] 1.2 Add failing table tests for empty context, invalid ranges and unsupported poetic forms, verifying every field error is reported.

## 2. Implement the domain capability

- [x] 2.1 Implement the brief value objects and typed construction result, verifying the normalization tests pass without IO.
- [x] 2.2 Expose a domain-facing input contract without CLI types, verifying architecture tests permit only inward dependencies.

## 3. Verify

- [x] 3.1 Run `npm test` and `npm run build`, verifying all brief and architecture tests pass under strict TypeScript.
