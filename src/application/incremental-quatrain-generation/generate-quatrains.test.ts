import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createGenerationBrief } from "../../domain/generation-brief/index.js";
import { generateQuatrains, type Finalist, type IncrementalCollaborators, type HardStage } from "./generate-quatrains.js";

const brief = (() => { const result = createGenerationBrief({ context: "egoísmo", candidateCount: 3, topK: 2, minimumScore: 80 }); if (!result.ok) throw new Error("fixture brief inválido"); return result.value; })();
const validHard = (): Readonly<Record<HardStage, "VALIDO">> => ({ structure: "VALIDO", metric: "VALIDO", rhyme: "VALIDO", lexicon: "VALIDO", ambiguity: "VALIDO", safety: "VALIDO" });
function collaborators(overrides: Partial<IncrementalCollaborators> = {}): IncrementalCollaborators {
  const base: IncrementalCollaborators = {
    plan: async () => ({ intent: "egoísmo" }), finalWords: async () => [{ v4: "sol", v2: "farol" }, { v4: "mar", v2: "altar" }],
    anchors: async () => ({}), writeVerse: async (slot) => `verso-${slot}`, validateVerse: async () => ({ verdict: "VALIDO" }),
    validateQuatrain: async () => validHard(), evaluate: async () => ({}), score: async () => 90,
    rank: async (items: readonly Finalist[]) => [...items].sort((a, b) => b.score - a.score),
  }; return { ...base, ...overrides };
}

describe("generateQuatrains", () => {
  it("returns ranked finalists and respects partial top-K", async () => {
    const result = await generateQuatrains(brief, collaborators());
    assert.equal(result.status, "SUCCESS"); assert.equal(result.finalists.length, 2); assert.equal(result.rejected.length, 0);
  });
  it("returns an unreliable empty result when no branch survives", async () => {
    const result = await generateQuatrains(brief, collaborators({ finalWords: async () => [] }));
    assert.equal(result.status, "UNRELIABLE"); assert.deepEqual(result.finalists, []);
  });
  for (const stage of ["structure", "metric", "rhyme", "lexicon", "ambiguity", "safety"] as const) {
    it(`blocks scoring when ${stage} is not valid`, async () => {
      let scored = false;
      const result = await generateQuatrains(brief, collaborators({
        validateQuatrain: async () => ({ ...validHard(), [stage]: "INVALIDO" }), score: async () => { scored = true; return 100; },
      }));
      assert.equal(scored, false); assert.equal(result.finalists.length, 0); assert.equal(result.rejected[0]?.stage, stage);
    });
  }
});
