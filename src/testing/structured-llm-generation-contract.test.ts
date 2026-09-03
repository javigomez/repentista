import {
  registerStructuredLlmGenerationContractTests,
  validSemanticOutline,
} from "./structured-llm-generation-contract.js";
import { FixtureStructuredLlmGenerator } from "./structured-llm-generation-fake.js";

registerStructuredLlmGenerationContractTests(
  "FixtureStructuredLlmGenerator",
  // validOutputFactory: returns a port that produces valid structured output
  () =>
    new FixtureStructuredLlmGenerator([
      {
        operation: "plan-semantic-outline",
        output: validSemanticOutline,
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-contract-valid",
        completedAt: "2026-09-03T10:00:00.000Z",
        durationMs: 25,
        usage: {
          inputTokens: 42,
          outputTokens: 68,
        },
      },
    ]),
  // incompleteResponseFactory: returns a port that simulates a refused/incomplete response
  () =>
    new FixtureStructuredLlmGenerator([
      {
        operation: "plan-semantic-outline",
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-contract-incomplete",
        completedAt: "2026-09-03T10:00:01.000Z",
        durationMs: 19,
        error: {
          code: "CONTENT_REJECTED",
          message: "The provider refused the request.",
          retryable: false,
        },
      },
    ]),
  // invalidSchemaFactory: returns a port that produces data failing local validation
  () =>
    new FixtureStructuredLlmGenerator([
      {
        operation: "plan-semantic-outline",
        output: {
          finalConcept: "Un dragon confunde el humo con perfume",
          verses: [{ slot: "V4", role: "remate" }],
        },
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-contract-invalid",
        completedAt: "2026-09-03T10:00:02.000Z",
        durationMs: 17,
        usage: {
          inputTokens: 38,
          outputTokens: 12,
        },
      },
    ]),
);
