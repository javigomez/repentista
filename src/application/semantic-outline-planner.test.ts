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

type StructuredLlmResult<T> = StructuredLlmSuccess<T>;

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

function deterministicStructuredLlm<T>(response: StructuredLlmResult<T>): {
  readonly client: {
    readonly generateStructured: (request: StructuredLlmRequest) => Promise<StructuredLlmResult<T>>;
  };
  readonly requests: readonly StructuredLlmRequest[];
} {
  return queuedStructuredLlm([response]);
}

function queuedStructuredLlm<T>(responses: readonly StructuredLlmResult<T>[]): {
  readonly client: {
    readonly generateStructured: (request: StructuredLlmRequest) => Promise<StructuredLlmResult<T>>;
  };
  readonly requests: readonly StructuredLlmRequest[];
} {
  const requests: StructuredLlmRequest[] = [];

  return {
    client: {
      async generateStructured(request) {
        const response = responses[requests.length];
        requests.push(request);

        if (response === undefined) {
          throw new Error("Structured LLM test double exhausted");
        }

        return response;
      },
    },
    requests,
  };
}

const successfulProvenance = Object.freeze({
  provider: "deterministic-test-double",
  model: "fake-semantic-outline-v1",
  prompt: {
    id: "semantic-outline-planner",
    version: "0.1.0",
  },
});

const validSemanticOutlineResponse = Object.freeze({
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
} as const satisfies SemanticOutlineResponse);

test("plans a valid semantic outline from structured LLM output", async () => {
  const briefResult = createGenerationBrief({
    context: "El egoísmo hace que los amigos se marchen",
    tone: "absurdo y cercano",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const llm = deterministicStructuredLlm<SemanticOutlineResponse>({
    ok: true,
    value: validSemanticOutlineResponse,
    provenance: successfulProvenance,
  });

  const result = await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    brief: briefResult.value,
    ...validSemanticOutlineResponse,
    provenance: successfulProvenance,
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

test("rejects semantic outline output with missing required fields", async () => {
  const briefResult = createGenerationBrief({
    context: "Un músico confunde ensayar con hacer ruido",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const llm = deterministicStructuredLlm<Partial<SemanticOutlineResponse>>({
    ok: true,
    value: {
      centralIdea: "practicar sin escuchar molesta más de lo que ayuda",
      comicDevice: "contraste entre esfuerzo musical y ruido doméstico",
      turn: "el músico cree mejorar, pero la casa entera pide pausa",
      finalIntention: "cerrar con la idea de que ensayar también exige oído",
      verseFunctions: {
        v1: "presentar al músico y su ruido",
        v2: "preparar la incomodidad sin escoger una rima",
        v3: "mostrar el cansancio de quienes escuchan",
        v4: "resolver con escucha y práctica real",
      },
      risks: ["castigar el aprendizaje en vez del exceso de ruido"],
      warnings: [],
    },
    provenance: successfulProvenance,
  });

  const result = await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
    maxAttempts: 1,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INVALID_SEMANTIC_OUTLINE");
  assert.equal(result.error.attempts, 1);
  assert.deepEqual(
    result.error.violations.map((violation) => ({
      path: violation.path,
      code: violation.code,
    })),
    [{ path: "scene", code: "REQUIRED_FIELD" }],
  );
  assert.equal(llm.requests.length, 1);
});

test("rejects semantic outline output that includes verses or rhyme words", async () => {
  const briefResult = createGenerationBrief({
    context: "Una maga presume trucos que nadie pidió",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const stageLeakingResponse = {
    ...validSemanticOutlineResponse,
    verses: {
      v1: "La maga llegó al salón",
      v2: "con su brillante sombrero",
      v3: "hizo humo sin razón",
      v4: "y perdió todo el dinero",
    },
    rhymeWords: {
      v2: "sombrero",
      v4: "dinero",
    },
  };

  const llm = deterministicStructuredLlm<Record<string, unknown>>({
    ok: true,
    value: stageLeakingResponse,
    provenance: successfulProvenance,
  });

  const result = await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
    maxAttempts: 1,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INVALID_SEMANTIC_OUTLINE");
  assert.equal(result.error.attempts, 1);
  assert.deepEqual(
    result.error.violations.map((violation) => ({
      path: violation.path,
      code: violation.code,
    })),
    [
      { path: "verses", code: "FORBIDDEN_STAGE_FIELD" },
      { path: "rhymeWords", code: "FORBIDDEN_STAGE_FIELD" },
    ],
  );
  assert.equal(llm.requests.length, 1);
});

test("stops semantic planning after exhausted invalid-output retries", async () => {
  const briefResult = createGenerationBrief({
    context: "Un pirata aprende que gritar no manda mejor",
  });
  assert.equal(briefResult.ok, true);
  if (!briefResult.ok) return;

  const missingSceneResponse = {
    ...validSemanticOutlineResponse,
    scene: undefined,
  };

  const stageLeakingResponse = {
    ...validSemanticOutlineResponse,
    rhymeWords: {
      v2: "timón",
      v4: "gritón",
    },
  };

  const llm = queuedStructuredLlm<Record<string, unknown>>([
    {
      ok: true,
      value: missingSceneResponse,
      provenance: successfulProvenance,
    },
    {
      ok: true,
      value: stageLeakingResponse,
      provenance: successfulProvenance,
    },
  ]);

  const result = await planSemanticOutline({
    brief: briefResult.value,
    llm: llm.client,
    maxAttempts: 2,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "SEMANTIC_OUTLINE_RETRIES_EXHAUSTED");
  assert.equal(result.error.attempts, 2);
  assert.equal(result.error.failures.length, 2);
  assert.deepEqual(
    llm.requests.map((request) => request.operation),
    ["generation.semantic-outline.plan", "generation.semantic-outline.plan"],
  );
});
