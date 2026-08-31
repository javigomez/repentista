import test from "node:test";
import assert from "node:assert/strict";

import { createVersionedDictionaryJsonLoader } from "./versioned-dictionary-json.js";

const manifestPath = "data/dictionary/manifest.json";

const dictionaryEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  form: "dragón",
  lemma: "dragón",
  tonicity: "aguda",
  category: "sustantivo",
  level: "basico",
  status: "approved",
  allowedAsPreparation: true,
  allowedAsPunchline: true,
  ...overrides,
});

const snapshot = (
  version: string,
  entries: readonly Record<string, unknown>[],
): Record<string, unknown> => ({
  formatVersion: 1,
  version,
  entries,
});

const manifest = (
  snapshots: readonly Record<string, unknown>[],
): Record<string, unknown> => ({
  formatVersion: 1,
  snapshots,
});

function encodeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function createTextReader(files: ReadonlyMap<string, string>): {
  readonly readPaths: readonly string[];
  readonly readText: (logicalPath: string) => Promise<string>;
} {
  const readPaths: string[] = [];

  return {
    readPaths,
    async readText(logicalPath: string): Promise<string> {
      readPaths.push(logicalPath);
      const text = files.get(logicalPath);

      if (text === undefined) {
        throw new Error(`Missing fixture ${logicalPath}`);
      }

      return text;
    },
  };
}

test("loads the selected dictionary snapshot from a versioned JSON manifest", async () => {
  const reader = createTextReader(
    new Map([
      [
        manifestPath,
        encodeJson(
          manifest([
            { version: "dictionary-2026-08-30", path: "dictionary-2026-08-30.json" },
            { version: "dictionary-2026-09-01", path: "dictionary-2026-09-01.json" },
          ]),
        ),
      ],
      [
        "data/dictionary/dictionary-2026-08-30.json",
        encodeJson(
          snapshot("dictionary-2026-08-30", [
            dictionaryEntry(),
            dictionaryEntry({ form: "balcón", lemma: "balcón", allowedAsPunchline: false }),
          ]),
        ),
      ],
      [
        "data/dictionary/dictionary-2026-09-01.json",
        encodeJson(
          snapshot("dictionary-2026-09-01", [
            dictionaryEntry({ form: "limón", lemma: "limón" }),
          ]),
        ),
      ],
    ]),
  );
  const loader = createVersionedDictionaryJsonLoader({ readText: reader.readText });

  const result = await loader.load({ manifestPath, version: "dictionary-2026-08-30" });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.snapshot.version, "dictionary-2026-08-30");
  assert.equal(result.snapshot.logicalPath, "data/dictionary/dictionary-2026-08-30.json");
  assert.deepEqual(reader.readPaths, [manifestPath, "data/dictionary/dictionary-2026-08-30.json"]);

  const lookup = result.snapshot.dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "  DRAGON ",
  });

  assert.equal(lookup.ok, true);
  if (!lookup.ok) return;

  assert.equal(lookup.status, "approved");
  assert.equal(lookup.entry.form, "dragón");
  assert.equal(lookup.entry.normalizedForm, "dragon");
  assert.equal(lookup.entry.allowedAsPunchline, true);
});

test("selects the requested version exactly without exposing neighboring snapshots", async () => {
  const reader = createTextReader(
    new Map([
      [
        manifestPath,
        encodeJson(
          manifest([
            { version: "dictionary-2026-08-30", path: "dictionary-2026-08-30.json" },
            { version: "dictionary-2026-09-01", path: "dictionary-2026-09-01.json" },
          ]),
        ),
      ],
      [
        "data/dictionary/dictionary-2026-08-30.json",
        encodeJson(snapshot("dictionary-2026-08-30", [dictionaryEntry()])),
      ],
      [
        "data/dictionary/dictionary-2026-09-01.json",
        encodeJson(
          snapshot("dictionary-2026-09-01", [
            dictionaryEntry({ form: "limón", lemma: "limón" }),
          ]),
        ),
      ],
    ]),
  );
  const loader = createVersionedDictionaryJsonLoader({ readText: reader.readText });

  const result = await loader.load({ manifestPath, version: "dictionary-2026-09-01" });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.snapshot.version, "dictionary-2026-09-01");
  assert.deepEqual(reader.readPaths, [manifestPath, "data/dictionary/dictionary-2026-09-01.json"]);

  const selectedLookup = result.snapshot.dictionary.findByForm({
    version: "dictionary-2026-09-01",
    form: "limón",
  });
  assert.equal(selectedLookup.ok, true);
  if (!selectedLookup.ok) return;
  assert.equal(selectedLookup.status, "approved");
  assert.equal(selectedLookup.entry.form, "limón");

  const neighboringLookup = result.snapshot.dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "dragón",
  });

  assert.deepEqual(neighboringLookup, {
    ok: false,
    error: {
      code: "DICTIONARY_VERSION_UNAVAILABLE",
      version: "dictionary-2026-08-30",
      availableVersions: ["dictionary-2026-09-01"],
    },
  });
});
