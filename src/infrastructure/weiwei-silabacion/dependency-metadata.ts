export interface WeiweiSilabacionDependencyMetadata {
  readonly packageName: "silabacion";
  readonly packageVersion: "0.5.2";
  readonly packageVersionRange: "0.5.2";
  readonly license: "MIT";
  readonly repository: "https://github.com/weiwei/silabacion";
  readonly npmPackage: "https://www.npmjs.com/package/silabacion";
  readonly verifiedAt: "2026-08-30";
  readonly evidence: {
    readonly readme: string;
    readonly packageApi: string;
    readonly license: string;
  };
}

export const WEIWEI_SILABACION_DEPENDENCY: WeiweiSilabacionDependencyMetadata = Object.freeze({
  packageName: "silabacion",
  packageVersion: "0.5.2",
  packageVersionRange: "0.5.2",
  license: "MIT",
  repository: "https://github.com/weiwei/silabacion",
  npmPackage: "https://www.npmjs.com/package/silabacion",
  verifiedAt: "2026-08-30",
  evidence: Object.freeze({
    readme:
      "README documents import { Word, Stress } from 'silabacion' and Word instance fields syllables, stress, rhyme, tonic, hiatuses, diphthongs, and triphthongs.",
    packageApi:
      "NPM package exposes built-in TypeScript declarations, main dist/index.js and typings dist/index.d.ts.",
    license: "README, repository metadata, and NPM package metadata all identify MIT.",
  }),
});
