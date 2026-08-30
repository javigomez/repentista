import test from "node:test";
import assert from "node:assert/strict";

import { fixedClock, sequenceDouble } from "./test-doubles.js";

test("fixedClock returns equal independent Date instances", () => {
  const clock = fixedClock("2026-08-30T10:00:00.000Z");
  const first = clock();
  const second = clock();

  assert.notEqual(first, second);
  assert.equal(first.toISOString(), second.toISOString());
});

test("sequenceDouble returns fixtures in order and fails when exhausted", () => {
  const next = sequenceDouble(["first", "second"]);

  assert.equal(next(), "first");
  assert.equal(next(), "second");
  assert.throws(next, /sequence exhausted/);
});
