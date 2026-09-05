import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createGenerationBrief } from "../../domain/generation-brief/index.js";
import {
  generateQuatrains,
  type HardStage,
  type IncrementalCollaborators,
  type Finalist,
} from "./generate-quatrains.js";

const validHard = (): Readonly<Record<HardStage, "VALIDO">> => ({
  structure: "VALIDO",
  metric: "VALIDO",
  rhyme: "VALIDO",
  lexicon: "VALIDO",
  ambiguity: "VALIDO",
  safety: "VALIDO",
});

describe("golden flow: egoísmo", () => {
  it("records the deterministic plan, rhyme anchors, verse gates and ranking", async () => {
    const briefResult = createGenerationBrief({
      context: "egoísmo",
      tone: "humor blanco",
      candidateCount: 1,
      topK: 1,
      minimumScore: 80,
    });
    assert.equal(briefResult.ok, true, "the golden brief must be valid");
    if (!briefResult.ok) throw new Error("golden brief unexpectedly invalid");

    const calls: string[] = [];
    const plan = {
      intent: "mostrar que el egoísta acaba solo",
      roles: ["presentación", "preparación", "giro", "remate"],
    };
    const anchors = {
      V1: "presume de no compartir",
      V2: "farol",
      V3: "los amigos se marchan",
      V4: "sol",
    };
    const verses = [
      "Todo lo quiere para él",
      "y presume como un farol",
      "sus amigos se van después",
      "y se queda bajo el sol",
    ] as const;

    const collaborators: IncrementalCollaborators = {
      plan: async (brief) => {
        calls.push(`plan:${brief.context}`);
        return plan;
      },
      finalWords: async (receivedPlan) => {
        calls.push(`finalWords:${(receivedPlan as typeof plan).intent}`);
        return [{ v4: "sol", v2: "farol" }];
      },
      anchors: async (_receivedPlan, words) => {
        calls.push(`anchors:${words.v2}/${words.v4}`);
        return anchors;
      },
      writeVerse: async (slot, input) => {
        calls.push(`write:${slot}:${(input as { verses: string[] }).verses.length}`);
        return verses[slot - 1];
      },
      validateVerse: async (slot, verse) => {
        calls.push(`validate:${slot}:${verse}`);
        return { verdict: "VALIDO" };
      },
      validateQuatrain: async (receivedVerses) => {
        calls.push(`quatrain:${receivedVerses.join("|")}`);
        return validHard();
      },
      evaluate: async () => {
        calls.push("evaluate");
        return { coherence: 9, humor: 9 };
      },
      score: async () => {
        calls.push("score");
        return 92;
      },
      rank: async (items: readonly Finalist[]) => {
        calls.push("rank");
        return items;
      },
    };

    const result = await generateQuatrains(briefResult.value, collaborators);

    assert.equal(result.status, "SUCCESS");
    assert.deepEqual(result.finalists[0], {
      plan,
      verses,
      score: 92,
      provenance: { v4: "sol", v2: "farol" },
    });
    assert.deepEqual(calls, [
      "plan:egoísmo",
      "finalWords:mostrar que el egoísta acaba solo",
      "anchors:farol/sol",
      "write:1:0",
      `validate:1:${verses[0]}`,
      "write:2:1",
      `validate:2:${verses[1]}`,
      "write:3:2",
      `validate:3:${verses[2]}`,
      "write:4:3",
      `validate:4:${verses[3]}`,
      `quatrain:${verses.join("|")}`,
      "evaluate",
      "score",
      "rank",
    ]);
    assert.deepEqual(
      result.auditEvents.filter((event) => event.type === "VERSE_VALIDATED").map((event) => event.verdict),
      ["VALIDO", "VALIDO", "VALIDO", "VALIDO"],
    );
  });
});
