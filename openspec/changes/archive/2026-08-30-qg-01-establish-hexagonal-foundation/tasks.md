## 1. Test foundation

- [x] 1.1 Add a TypeScript-compatible test runner and a reproducible `npm test` script, verifying a deliberately failing smoke test is detected before making it pass.
- [x] 1.2 Add shared test conventions for fixtures and deterministic doubles, verifying the suite runs without network access or credentials.

## 2. Hexagonal boundaries

- [x] 2.1 Create the domain, application, ports and infrastructure module boundaries, verifying TypeScript strict compilation resolves their public entrypoints.
- [x] 2.2 Add failing architecture tests for forbidden dependency directions, then implement the minimum import rules until the tests pass.
- [x] 2.3 Move the executable composition root to the CLI infrastructure boundary and verify it delegates a smoke request without containing domain behavior.

## 3. Verification

- [x] 3.1 Run `npm test` and verify unit and architecture tests pass.
- [x] 3.2 Run `npm run build` and verify the ESM CLI entrypoint compiles under strict TypeScript.
