import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { extractRelativeImports } from "../../testing/architecture-rules.js";
import { createInitialEditorialSafetyPolicy } from "../../content/editorial-safety-policy/index.js";
import {
  createEditorialSafetyValidator,
  type EditorialSafetySegment,
  type EditorialSafetyValidator,
} from "./index.js";

const validator: EditorialSafetyValidator = createEditorialSafetyValidator(
  createInitialEditorialSafetyPolicy(),
);

const segment = (
  kind: "context" | "verse" | "anchor",
  text: string,
  slot?: "V1" | "V2" | "V3" | "V4",
): EditorialSafetySegment => ({
  location: { kind, ...(slot === undefined ? {} : { slot }) },
  text,
});

test("returns VALIDO with the policy version when no rule matches", () => {
  const result = validator.validate({
    segments: [segment("verse", "un dragón baila bajo la luna", "V1")],
  });

  assert.deepEqual(result, {
    verdict: "VALIDO",
    policyVersion: "editorial-safety-policy/v1",
    matches: [],
  });
});

test("returns INVALIDO with rule, location and fragment for an unambiguous blocking term", () => {
  const result = validator.validate({
    segments: [segment("verse", "ese niño es un maricón", "V2")],
  });

  assert.equal(result.verdict, "INVALIDO");
  assert.equal(result.policyVersion, "editorial-safety-policy/v1");
  assert.equal(result.matches.length, 1);
  assert.deepEqual(result.matches[0], {
    ruleId: "discriminacion",
    category: "discriminacion",
    severity: "BLOQUEANTE",
    location: { kind: "verse", slot: "V2" },
    fragment: "maricón",
  });
});

test("matches blocking terms case- and accent-insensitively with localized evidence", () => {
  const result = validator.validate({
    segments: [segment("anchor", "encontró COCAINA en el patio", "V3")],
  });

  assert.equal(result.verdict, "INVALIDO");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].ruleId, "sustancias");
  assert.equal(result.matches[0].severity, "BLOQUEANTE");
  assert.equal(result.matches[0].fragment, "cocaína");
  assert.deepEqual(result.matches[0].location, { kind: "anchor", slot: "V3" });
});

test("returns DUDOSO for a polysemic term instead of silently approving it", () => {
  const result = validator.validate({
    segments: [segment("verse", "lleva una pistola de agua al recreo", "V4")],
  });

  assert.equal(result.verdict, "DUDOSO");
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0].ruleId, "armas-contextuales");
  assert.equal(result.matches[0].severity, "DUDOSO");
  assert.equal(result.matches[0].fragment, "pistola");
});

test("collects every matching rule exhaustively when several fire", () => {
  const result = validator.validate({
    segments: [
      segment("context", "una fiesta con cocaína"),
      segment("verse", "y un maricón en la esquina", "V2"),
    ],
  });

  assert.equal(result.verdict, "INVALIDO");
  assert.deepEqual(
    result.matches.map((match) => match.ruleId),
    ["sustancias", "discriminacion"],
  );
});

test("applies ALL-mode combinations only when every term co-occurs", () => {
  const partial = validator.validate({
    segments: [segment("verse", "el perro duerme tranquilo", "V1")],
  });
  assert.equal(partial.verdict, "VALIDO");

  const combined = validator.validate({
    segments: [segment("verse", "le va a pegar al perro sin motivo", "V1")],
  });
  assert.equal(combined.verdict, "INVALIDO");
  assert.deepEqual(
    combined.matches.map((match) => [match.ruleId, match.fragment]),
    [
      ["maltrato-animal", "pegar"],
      ["maltrato-animal", "perro"],
    ],
  );
});

test("never performs remote moderation or calls an LLM", async () => {
  const source = await readFile("src/validators/editorial-safety/index.ts", "utf8");
  const externalImports = extractRelativeImports(source).filter((specifier) =>
    !specifier.startsWith("."),
  );

  assert.deepEqual(externalImports, []);
});
