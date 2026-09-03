import { dirname, join } from "node:path/posix";

import {
  ApprovedWordDictionaryCreationError,
  createInMemoryApprovedWordDictionary,
  type ApprovedWordDictionary,
  type ApprovedWordFieldError,
  type ApprovedWordInput,
} from "../../content/approved-word-dictionary/index.js";

type UnknownRecord = Record<string, unknown>;

/** Reads the text of a logical file path. Backed by the filesystem in production. */
export type TextReader = (logicalPath: string) => Promise<string>;

export interface VersionedDictionaryJsonLoaderOptions {
  readonly readText: TextReader;
}

export interface VersionedDictionaryJsonLoadRequest {
  readonly manifestPath: string;
  readonly version: string;
}

export interface DictionarySnapshot {
  readonly version: string;
  readonly logicalPath: string;
  readonly dictionary: ApprovedWordDictionary;
}

export interface EntryIssue {
  readonly index: number;
  readonly field: string;
  readonly code: string;
}

export type VersionedDictionaryJsonError =
  | { readonly code: "FILE_NOT_FOUND"; readonly logicalPath: string; readonly version?: string }
  | { readonly code: "INVALID_JSON"; readonly logicalPath: string }
  | { readonly code: "DUPLICATE_VERSION"; readonly version: string }
  | { readonly code: "SCHEMA_VIOLATION"; readonly logicalPath: string }
  | { readonly code: "INVALID_ENTRY"; readonly issues: readonly EntryIssue[] };

export type VersionedDictionaryJsonLoadResult =
  | { readonly ok: true; readonly snapshot: DictionarySnapshot }
  | { readonly ok: false; readonly error: VersionedDictionaryJsonError };

export interface VersionedDictionaryJsonLoader {
  load(request: VersionedDictionaryJsonLoadRequest): Promise<VersionedDictionaryJsonLoadResult>;
}

interface ManifestSnapshotDescriptor {
  readonly version: string;
  readonly path: string;
}

interface SnapshotDescriptor {
  readonly version: string;
  readonly entries: readonly unknown[];
}

const SUPPORTED_FORMAT_VERSION = 1;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isEnoentError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function schemaViolation(
  logicalPath: string,
): { readonly ok: false; readonly error: VersionedDictionaryJsonError } {
  return { ok: false, error: Object.freeze({ code: "SCHEMA_VIOLATION" as const, logicalPath }) };
}

async function readTextOrNotFound(
  readText: TextReader,
  logicalPath: string,
): Promise<
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: VersionedDictionaryJsonError }
> {
  try {
    const text = await readText(logicalPath);
    return { ok: true, text };
  } catch (error) {
    if (isEnoentError(error)) {
      return { ok: false, error: Object.freeze({ code: "FILE_NOT_FOUND" as const, logicalPath }) };
    }
    throw error;
  }
}

function parseJson(
  text: string,
  logicalPath: string,
):
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: VersionedDictionaryJsonError } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: Object.freeze({ code: "INVALID_JSON" as const, logicalPath }) };
  }
}

function parseManifest(
  value: unknown,
  logicalPath: string,
):
  | { readonly ok: true; readonly snapshots: readonly ManifestSnapshotDescriptor[] }
  | { readonly ok: false; readonly error: VersionedDictionaryJsonError } {
  if (!isRecord(value) || value.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    return schemaViolation(logicalPath);
  }

  const rawSnapshots = value.snapshots;
  if (!Array.isArray(rawSnapshots)) {
    return schemaViolation(logicalPath);
  }

  const snapshots: ManifestSnapshotDescriptor[] = [];
  for (const rawSnapshot of rawSnapshots) {
    if (!isRecord(rawSnapshot)) {
      return schemaViolation(logicalPath);
    }
    const version = rawSnapshot.version;
    const path = rawSnapshot.path;
    if (!isNonEmptyString(version) || !isNonEmptyString(path)) {
      return schemaViolation(logicalPath);
    }
    snapshots.push({ version, path });
  }

  return {
    ok: true,
    snapshots: Object.freeze(snapshots.map((snapshot) => Object.freeze(snapshot))),
  };
}

function findDuplicateVersion(snapshots: readonly ManifestSnapshotDescriptor[]): string | undefined {
  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    if (seen.has(snapshot.version)) {
      return snapshot.version;
    }
    seen.add(snapshot.version);
  }
  return undefined;
}

function parseSnapshot(
  value: unknown,
  logicalPath: string,
):
  | { readonly ok: true; readonly snapshot: SnapshotDescriptor }
  | { readonly ok: false; readonly error: VersionedDictionaryJsonError } {
  if (!isRecord(value) || value.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    return schemaViolation(logicalPath);
  }
  if (!isNonEmptyString(value.version)) {
    return schemaViolation(logicalPath);
  }
  if (!Array.isArray(value.entries)) {
    return schemaViolation(logicalPath);
  }
  return { ok: true, snapshot: { version: value.version, entries: value.entries } };
}

function toApprovedWordInput(entry: UnknownRecord, version: string): ApprovedWordInput {
  return {
    version,
    form: entry.form as string,
    lemma: entry.lemma as string,
    tonicity: entry.tonicity as string,
    category: entry.category as string,
    level: entry.level as string,
    status: entry.status as string,
    allowedAsPreparation: entry.allowedAsPreparation as boolean,
    allowedAsPunchline: entry.allowedAsPunchline as boolean,
  };
}

function toEntryIssue(error: ApprovedWordFieldError): EntryIssue {
  const indexMatch = /\[(\d+)\]/u.exec(error.field);
  const index = indexMatch === null ? -1 : Number(indexMatch[1]);
  const fieldSegments = error.field.split(".");
  const field = fieldSegments[fieldSegments.length - 1] ?? error.field;
  return Object.freeze({ index, field, code: error.code });
}

function invalidEntry(issues: readonly EntryIssue[]): VersionedDictionaryJsonLoadResult {
  return {
    ok: false,
    error: Object.freeze({ code: "INVALID_ENTRY" as const, issues: Object.freeze(issues) }),
  };
}

export function createVersionedDictionaryJsonLoader(
  options: VersionedDictionaryJsonLoaderOptions,
): VersionedDictionaryJsonLoader {
  const readText = options.readText;

  return Object.freeze({
    async load(request: VersionedDictionaryJsonLoadRequest): Promise<VersionedDictionaryJsonLoadResult> {
      const { manifestPath, version } = request;

      const manifestRead = await readTextOrNotFound(readText, manifestPath);
      if (!manifestRead.ok) {
        return manifestRead;
      }

      const manifestJson = parseJson(manifestRead.text, manifestPath);
      if (!manifestJson.ok) {
        return manifestJson;
      }

      const manifestDto = parseManifest(manifestJson.value, manifestPath);
      if (!manifestDto.ok) {
        return manifestDto;
      }

      const duplicateVersion = findDuplicateVersion(manifestDto.snapshots);
      if (duplicateVersion !== undefined) {
        return {
          ok: false,
          error: Object.freeze({ code: "DUPLICATE_VERSION" as const, version: duplicateVersion }),
        };
      }

      const selected = manifestDto.snapshots.find((snapshot) => snapshot.version === version);
      if (selected === undefined) {
        return {
          ok: false,
          error: Object.freeze({
            code: "FILE_NOT_FOUND" as const,
            logicalPath: manifestPath,
            version,
          }),
        };
      }

      const snapshotPath = join(dirname(manifestPath), selected.path);

      const snapshotRead = await readTextOrNotFound(readText, snapshotPath);
      if (!snapshotRead.ok) {
        return snapshotRead;
      }

      const snapshotJson = parseJson(snapshotRead.text, snapshotPath);
      if (!snapshotJson.ok) {
        return snapshotJson;
      }

      const snapshotDto = parseSnapshot(snapshotJson.value, snapshotPath);
      if (!snapshotDto.ok) {
        return snapshotDto;
      }

      if (snapshotDto.snapshot.version !== version) {
        return schemaViolation(snapshotPath);
      }

      const inputs: ApprovedWordInput[] = [];
      const issues: EntryIssue[] = [];

      snapshotDto.snapshot.entries.forEach((entry, index) => {
        if (!isRecord(entry)) {
          issues.push(Object.freeze({ index, field: "entry", code: "INVALID_ENTRY" }));
          return;
        }
        inputs.push(toApprovedWordInput(entry, version));
      });

      if (issues.length > 0) {
        return invalidEntry(issues);
      }

      let dictionary: ApprovedWordDictionary;
      try {
        const versions: Readonly<Record<string, readonly ApprovedWordInput[]>> = {
          [version]: inputs,
        };
        dictionary = createInMemoryApprovedWordDictionary({ versions });
      } catch (error) {
        if (error instanceof ApprovedWordDictionaryCreationError) {
          return invalidEntry(error.errors.map(toEntryIssue));
        }
        throw error;
      }

      return {
        ok: true,
        snapshot: Object.freeze({
          version,
          logicalPath: snapshotPath,
          dictionary,
        }),
      };
    },
  });
}
