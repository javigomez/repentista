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
