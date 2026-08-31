import {
  createSemanticOutline,
  type SemanticOutline,
  type SemanticOutlineProvenance,
  type SemanticOutlineViolation,
} from "../../domain/semantic-outline/index.js";
import type { GenerationBrief } from "../../domain/generation-brief/index.js";

export interface StructuredLlmRequest {
  readonly operation: string;
  readonly prompt: {
    readonly id: string;
    readonly version: string;
    readonly text: string;
  };
  readonly input: unknown;
  readonly schema: unknown;
}

export type StructuredLlmResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly provenance: SemanticOutlineProvenance;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
    };

export interface StructuredLlmClient {
  readonly generateStructured: (
    request: StructuredLlmRequest,
  ) => Promise<StructuredLlmResult<unknown>>;
}

export interface PlanSemanticOutlineCommand {
  readonly brief: GenerationBrief;
  readonly llm: StructuredLlmClient;
  readonly maxAttempts?: number;
}

export interface SemanticOutlineAttemptFailure {
  readonly attempt: number;
  readonly violations: readonly SemanticOutlineViolation[];
}

export type PlanSemanticOutlineError =
  | {
      readonly code: "INVALID_SEMANTIC_OUTLINE";
      readonly attempts: number;
      readonly violations: readonly SemanticOutlineViolation[];
    }
  | {
      readonly code: "SEMANTIC_OUTLINE_RETRIES_EXHAUSTED";
      readonly attempts: number;
      readonly failures: readonly SemanticOutlineAttemptFailure[];
    }
  | {
      readonly code: "STRUCTURED_LLM_GENERATION_FAILED";
      readonly attempts: number;
      readonly cause: {
        readonly code: string;
        readonly message: string;
        readonly retryable: boolean;
      };
    };

export type PlanSemanticOutlineResult =
  | { readonly ok: true; readonly value: SemanticOutline }
  | { readonly ok: false; readonly error: PlanSemanticOutlineError };

const semanticOutlinePrompt = Object.freeze({
  id: "semantic-outline-planner",
  version: "0.1.0",
  text: [
    "Convierte el brief en una planificacion semantica previa a rimas y versos.",
    "Devuelve solo el objeto estructurado solicitado.",
    "Incluye idea central, escena concreta, recurso comico, giro, intencion final, funcion de V1-V4, riesgos y advertencias.",
    "No escribas versos.",
    "No elijas palabras de rima ni palabras finales.",
    "Manten las razones breves y observables; no incluyas razonamiento interno extenso.",
  ].join("\n"),
});

export const SEMANTIC_OUTLINE_PLANNER_OPERATION = "generation.semantic-outline.plan";

export const SEMANTIC_OUTLINE_OUTPUT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: [
    "centralIdea",
    "scene",
    "comicDevice",
    "turn",
    "finalIntention",
    "verseFunctions",
    "risks",
    "warnings",
  ],
  properties: {
    centralIdea: { type: "string" },
    scene: { type: "string" },
    comicDevice: { type: "string" },
    turn: { type: "string" },
    finalIntention: { type: "string" },
    verseFunctions: {
      type: "object",
      additionalProperties: false,
      required: ["v1", "v2", "v3", "v4"],
      properties: {
        v1: { type: "string" },
        v2: { type: "string" },
        v3: { type: "string" },
        v4: { type: "string" },
      },
    },
    risks: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const satisfies Record<string, unknown>);

const defaultMaxAttempts = 2;

const normalizeMaxAttempts = (maxAttempts: number | undefined): number => {
  if (maxAttempts === undefined) {
    return defaultMaxAttempts;
  }

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("maxAttempts debe ser un entero positivo.");
  }

  return maxAttempts;
};

const semanticOutlineRequest = (brief: GenerationBrief): StructuredLlmRequest =>
  Object.freeze({
    operation: SEMANTIC_OUTLINE_PLANNER_OPERATION,
    prompt: semanticOutlinePrompt,
    input: Object.freeze({ brief }),
    schema: SEMANTIC_OUTLINE_OUTPUT_SCHEMA,
  });

export async function planSemanticOutline(
  command: PlanSemanticOutlineCommand,
): Promise<PlanSemanticOutlineResult> {
  const maxAttempts = normalizeMaxAttempts(command.maxAttempts);
  const failures: SemanticOutlineAttemptFailure[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await command.llm.generateStructured(semanticOutlineRequest(command.brief));

    if (!response.ok) {
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "STRUCTURED_LLM_GENERATION_FAILED" as const,
          attempts: attempt,
          cause: response.error,
        }),
      });
    }

    const outline = createSemanticOutline({
      brief: command.brief,
      output: response.value,
      provenance: response.provenance,
    });

    if (outline.ok) {
      return outline;
    }

    if (maxAttempts === 1) {
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "INVALID_SEMANTIC_OUTLINE" as const,
          attempts: attempt,
          violations: outline.violations,
        }),
      });
    }

    failures.push(
      Object.freeze({
        attempt,
        violations: outline.violations,
      }),
    );
  }

  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "SEMANTIC_OUTLINE_RETRIES_EXHAUSTED" as const,
      attempts: maxAttempts,
      failures: Object.freeze(failures),
    }),
  });
}
