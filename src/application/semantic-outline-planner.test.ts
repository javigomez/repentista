import test from "node:test";
import assert from "node:assert/strict";

import { createGenerationBrief } from "../domain/generation-brief/index.js";
import { planSemanticOutline } from "./semantic-outline-planner/index.js";

interface StructuredLlmRequest {
  readonly operation: string;
  readonly prompt: {
    readonly id: string;
    readonly version: string;
    readonly text: string;
  };
  readonly input: unknown;
  readonly schema: unknown;
}

interface StructuredLlmSuccess<T> {
  readonly ok: true;
  readonly value: T;
  readonly provenance: {
    readonly provider: string;
    readonly model: string;
    readonly prompt: {
      readonly id: string;
      readonly version: string;
    };
  };
}

interface SemanticOutlineResponse {
  readonly centralIdea: string;
  readonly scene: string;
  readonly comicDevice: string;
  readonly turn: string;
  readonly finalIntention: string;
  readonly verseFunctions: {
    readonly v1: string;
    readonly v2: string;
    readonly v3: string;
    readonly v4: string;
  };
  readonly risks: readonly string[];
  readonly warnings: readonly string[];
}

function deterministicStructuredLlm<T>(response: StructuredLlmSuccess<T>): {
  readonly client: {
    readonly generateStructured: (request: StructuredLlmRequest) => Promise<StructuredLlmSuccess<T>>;
  };
  readonly requests: readonly StructuredLlmRequest[];
} {
  const requests: StructuredLlmRequest[] = [];

  return {
    client: {
      async generateStructured(request) {
        requests.push(request);
        return response;
      },
    },
    requests,
  };
}

test("plans a valid semantic outline from structured LLM output", async () => {
  const briefResult = createGenerationBrief({
    context: "El egoísmo hace que los amigos se marchen",
    tone: "absurdo y cercano",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const llm = deterministicStructuredLlm<SemanticOutlineResponse>({
    ok: true,
    value: {
      centralIdea: "quien nunca comparte acaba quedándose sin compañía",
      scene: "una merienda en la que alguien guarda todos los churros",
      comicDevice: "exageración cotidiana con comida demasiado vigilada",
      turn: "la merienda parece abundante, pero nadie quiere sentarse con la persona egoísta",
      finalIntention: "rematar que guardar todo para uno mismo deja la mesa vacía de amigos",
      verseFunctions: {
        v1: "presentar la merienda y el gesto de esconderla",
        v2: "preparar la tensión social sin fijar una palabra de rima",
        v3: "mostrar que los demás detectan el egoísmo",
        v4: "resolver con la pérdida de compañía",
      },
      risks: ["moralizar demasiado", "confundir egoísmo con hambre"],
      warnings: ["evitar sermón explícito"],
    },
    provenance: {
      provider: "deterministic-test-double",
      model: "fake-semantic-outline-v1",
      prompt: {
        id: "semantic-outline-planner",
        version: "0.1.0",
      },
    },
  });

  const result = await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    brief: briefResult.value,
    centralIdea: "quien nunca comparte acaba quedándose sin compañía",
    scene: "una merienda en la que alguien guarda todos los churros",
    comicDevice: "exageración cotidiana con comida demasiado vigilada",
    turn: "la merienda parece abundante, pero nadie quiere sentarse con la persona egoísta",
    finalIntention: "rematar que guardar todo para uno mismo deja la mesa vacía de amigos",
    verseFunctions: {
      v1: "presentar la merienda y el gesto de esconderla",
      v2: "preparar la tensión social sin fijar una palabra de rima",
      v3: "mostrar que los demás detectan el egoísmo",
      v4: "resolver con la pérdida de compañía",
    },
    risks: ["moralizar demasiado", "confundir egoísmo con hambre"],
    warnings: ["evitar sermón explícito"],
    provenance: {
      provider: "deterministic-test-double",
      model: "fake-semantic-outline-v1",
      prompt: {
        id: "semantic-outline-planner",
        version: "0.1.0",
      },
    },
  });
});

test("requests semantic planning with a versioned prompt and no verse-writing task", async () => {
  const briefResult = createGenerationBrief({
    context: "Un dragón confunde presumir con compartir",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const llm = deterministicStructuredLlm<SemanticOutlineResponse>({
    ok: true,
    value: {
      centralIdea: "presumir mucho no demuestra generosidad",
      scene: "un dragón enseña un tesoro que nadie puede tocar",
      comicDevice: "contraste entre grandeza fantástica y mezquindad doméstica",
      turn: "la escena promete aventura, pero el conflicto es no prestar nada",
      finalIntention: "cerrar con la idea de que compartir vale más que lucir tesoros",
      verseFunctions: {
        v1: "presentar al dragón y su tesoro",
        v2: "crear expectativa sin seleccionar rima",
        v3: "tensar la situación con los visitantes",
        v4: "rematar el aprendizaje de compartir",
      },
      risks: ["adelantar la palabra final del remate"],
      warnings: [],
    },
    provenance: {
      provider: "deterministic-test-double",
      model: "fake-semantic-outline-v1",
      prompt: {
        id: "semantic-outline-planner",
        version: "0.1.0",
      },
    },
  });

  await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
  });

  assert.equal(llm.requests.length, 1);
  assert.equal(llm.requests[0]?.operation, "generation.semantic-outline.plan");
  assert.equal(llm.requests[0]?.prompt.id, "semantic-outline-planner");
  assert.equal(llm.requests[0]?.prompt.version, "0.1.0");
  assert.match(llm.requests[0]?.prompt.text ?? "", /no escribas versos/iu);
  assert.match(llm.requests[0]?.prompt.text ?? "", /no elijas palabras de rima/iu);
  assert.deepEqual(llm.requests[0]?.input, { brief: briefResult.value });
});
