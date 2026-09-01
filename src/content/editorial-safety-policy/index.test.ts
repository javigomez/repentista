import test from "node:test";
import assert from "node:assert/strict";

import {
  createEditorialSafetyPolicy,
  createInitialEditorialSafetyPolicy,
  normalizeEditorialSafetyTerm,
  type EditorialSafetyPolicyInput,
} from "./index.js";

const validInput = (
  overrides: Partial<EditorialSafetyPolicyInput> = {},
): EditorialSafetyPolicyInput => ({
  version: "editorial-safety-policy/v1",
  audience: "10-12",
  rules: [
    {
      id: "insulto",
      category: "discriminacion",
      severity: "BLOQUEANTE",
      mode: "ANY",
      terms: ["maricón"],
    },
  ],
  ...overrides,
});

test("creates a frozen policy with the audience and normalized term lookup helper", () => {
  const result = createInitialEditorialSafetyPolicy();

  assert.equal(result.version, "editorial-safety-policy/v1");
  assert.equal(result.audience, "10-12");
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.rules), true);
  assert.equal(normalizeEditorialSafetyTerm("Maricón"), "maricon");
  assert.equal(normalizeEditorialSafetyTerm("  Dragón  "), "dragon");
});

test("rejects a policy with duplicate rule identifiers", () => {
  const result = createEditorialSafetyPolicy(
    validInput({
      rules: [
        { id: "insulto", category: "discriminacion", severity: "BLOQUEANTE", mode: "ANY", terms: ["maricón"] },
        { id: "insulto", category: "discriminacion", severity: "BLOQUEANTE", mode: "ANY", terms: ["subnormal"] },
      ],
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(
    result.errors.map((error) => [error.field, error.code]),
    [["rules[1].id", "DUPLICATE_RULE_ID"]],
  );
});

test("rejects rules with unsupported severity or mode", () => {
  const result = createEditorialSafetyPolicy(
    validInput({
      rules: [
        {
          id: "insulto",
          category: "discriminacion",
          severity: "SEVERO" as "BLOQUEANTE",
          mode: "ANY",
          terms: ["maricón"],
        },
      ],
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(
    result.errors.map((error) => [error.field, error.code]),
    [["rules[0].severity", "UNSUPPORTED_SEVERITY"]],
  );
});

test("rejects rules without terms", () => {
  const result = createEditorialSafetyPolicy(
    validInput({
      rules: [{ id: "insulto", category: "discriminacion", severity: "BLOQUEANTE", mode: "ANY", terms: [] }],
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(
    result.errors.map((error) => [error.field, error.code]),
    [["rules[0].terms", "EMPTY_TERMS"]],
  );
});
