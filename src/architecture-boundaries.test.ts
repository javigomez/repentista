import test from "node:test";
import assert from "node:assert/strict";

test("the generator exposes the four hexagonal module boundaries", async () => {
  const modules = await Promise.all([
    import("./domain/index.js"),
    import("./application/index.js"),
    import("./ports/index.js"),
    import("./infrastructure/index.js"),
  ]);

  assert.equal(modules.length, 4);
});
