export type Layer = "domain" | "application" | "ports" | "infrastructure";

const forbiddenLayers: Record<Layer, readonly Layer[]> = {
  domain: ["application", "ports", "infrastructure"],
  application: ["infrastructure"],
  ports: ["infrastructure"],
  infrastructure: [],
};

export function layerForPath(path: string): Layer {
  const layer = path.split("/").find((segment): segment is Layer =>
    segment in forbiddenLayers,
  );

  if (!layer) {
    throw new Error(`Cannot determine architecture layer for ${path}`);
  }

  return layer;
}

export function extractRelativeImports(source: string): string[] {
  const imports: string[] = [];
  const importPattern = /(?:from\s+|import\s*(?:\(\s*)?)(["'])([^"']+)\1/g;

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[2];

    if (specifier !== undefined) {
      imports.push(specifier);
    }
  }

  return imports;
}

export function assertLayerDependencies(layer: Layer, imports: readonly string[]): void {
  for (const specifier of imports) {
    if (!specifier.startsWith(".")) {
      if (layer !== "infrastructure") {
        throw new Error(`forbidden dependency: ${layer} imports ${specifier}`);
      }

      continue;
    }

    const importedLayer = (Object.keys(forbiddenLayers) as Layer[]).find((candidate) =>
      specifier.includes(`/${candidate}/`) || specifier.endsWith(`/${candidate}`),
    );

    if (importedLayer && forbiddenLayers[layer].includes(importedLayer)) {
      throw new Error(`forbidden dependency: ${layer} imports ${importedLayer}`);
    }
  }
}

const CATALOG_PATH = "/content/approved-consonant-rhyme-catalog/";
const CATALOG_OWNER = "src/content/approved-consonant-rhyme-catalog/";
const FAMILY_DERIVATION = /(?:lastIndexOf\s*\(|slice\s*\([^)]*last|(?:family|rhyme|phonetic)\s*(?:Key|Tail)\s*=)/i;
const CATALOG_INTERNALS = /(?:asConsonantPhoneticTail|buildApprovedConsonantRhymeCatalog|findFamilyBy(?:Word|Tail))/;

export interface BoundaryException {
  readonly path: string;
  readonly reason: string;
  readonly removalCondition: string;
}

/** Validates the deliberately narrow, temporary exception registry. */
export function assertBoundaryExceptions(exceptions: readonly BoundaryException[]): void {
  for (const exception of exceptions) {
    const path = exception.path.replaceAll("\\", "/");
    if (!path || path.endsWith("/") || /[*?\[\]{}]/.test(path)) {
      throw new Error(`boundary exception must name an exact file, not a directory or pattern: ${exception.path}`);
    }
    if (!exception.reason.trim()) {
      throw new Error(`boundary exception for ${path} requires a reason`);
    }
    if (!exception.removalCondition.trim()) {
      throw new Error(`boundary exception for ${path} requires a removal condition`);
    }
  }
}

/** Enforces that consonant-family extraction and membership remain owned by the catalog. */
export function assertConsonantRhymeCatalogBoundary(
  path: string,
  source: string,
  exceptions: readonly BoundaryException[] = [],
): void {
  assertBoundaryExceptions(exceptions);
  const normalizedPath = path.replaceAll("\\", "/");
  if (exceptions.some((exception) => exception.path.replaceAll("\\", "/") === normalizedPath)) {
    return;
  }
  const isOwner = path.replaceAll("\\", "/").includes(CATALOG_OWNER);
  if (!isOwner && FAMILY_DERIVATION.test(source)) {
    throw new Error(`${path}: forbidden implementation of the approved consonant rhyme catalog boundary`);
  }

  if (!isOwner && CATALOG_INTERNALS.test(source) && source.includes(CATALOG_PATH)) {
    throw new Error(`${path}: consumer may not import catalog internals; use the owner boundary API`);
  }
}
