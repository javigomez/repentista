import test from "node:test";
import assert from "node:assert/strict";

import { WEIWEI_SILABACION_DEPENDENCY } from "./dependency-metadata.js";

test("records the verified silabacion dependency contract", () => {
  assert.deepEqual(WEIWEI_SILABACION_DEPENDENCY, {
    packageName: "silabacion",
    packageVersion: "0.5.2",
    packageVersionRange: "0.5.2",
    license: "MIT",
    repository: "https://github.com/weiwei/silabacion",
    npmPackage: "https://www.npmjs.com/package/silabacion",
    verifiedAt: "2026-08-30",
    evidence: {
      readme:
        "README documents import { Word, Stress } from 'silabacion' and Word instance fields syllables, stress, rhyme, tonic, hiatuses, diphthongs, and triphthongs.",
      packageApi:
        "NPM package exposes built-in TypeScript declarations, main dist/index.js and typings dist/index.d.ts.",
      license: "README, repository metadata, and NPM package metadata all identify MIT.",
    },
  });
  assert.equal(Object.isFrozen(WEIWEI_SILABACION_DEPENDENCY), true);
  assert.equal(Object.isFrozen(WEIWEI_SILABACION_DEPENDENCY.evidence), true);
});
