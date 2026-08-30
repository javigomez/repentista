import test from "node:test";
import assert from "node:assert/strict";

import { runCli } from "./main.js";

test("the CLI composition root delegates to the application handler", () => {
  let calls = 0;

  runCli(() => {
    calls += 1;
  });

  assert.equal(calls, 1);
});
