import {
  registerStructuredLlmGenerationContractTests,
  validSemanticOutline,
} from "../../testing/structured-llm-generation-contract.js";
import {
  createOpenAiResponsesAdapter,
  type OpenAiResponsesClient,
} from "./index.js";

/**
 * Contract tests for the OpenAI Responses adapter.
 * These verify the adapter satisfies the shared port contract.
 */

// Simulated client that returns valid structured output
const validOutputClient: OpenAiResponsesClient = {
  async createResponse() {
    return {
      id: "resp-contract-valid",
      model: "gpt-4o-2024-08-06",
      status: "completed",
      output_text: JSON.stringify(validSemanticOutline),
      usage: {
        input_tokens: 42,
        output_tokens: 68,
        total_tokens: 110,
      },
    };
  },
};

// Simulated client that returns an incomplete response (content filter)
const incompleteResponseClient: OpenAiResponsesClient = {
  async createResponse() {
    return {
      id: "resp-contract-incomplete",
      model: "gpt-4o-2024-08-06",
      status: "incomplete",
      incomplete_details: {
        reason: "content_filter",
      },
      usage: {
        input_tokens: 10,
        output_tokens: 0,
        total_tokens: 10,
      },
    };
  },
};

// Simulated client that returns schema-invalid data
const invalidSchemaClient: OpenAiResponsesClient = {
  async createResponse() {
    return {
      id: "resp-contract-invalid",
      model: "gpt-4o-2024-08-06",
      status: "completed",
      output_text: JSON.stringify({
        finalConcept: "Un dragon confunde el humo con perfume",
        verses: [{ slot: "V4", role: "remate" }], // Only 1 verse, schema requires 4
      }),
      usage: {
        input_tokens: 38,
        output_tokens: 12,
        total_tokens: 50,
      },
    };
  },
};

registerStructuredLlmGenerationContractTests(
  "OpenAI Responses adapter",
  // validOutputFactory
  () =>
    createOpenAiResponsesAdapter(
      { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
      validOutputClient,
    ),
  // incompleteResponseFactory
  () =>
    createOpenAiResponsesAdapter(
      { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
      incompleteResponseClient,
    ),
  // invalidSchemaFactory
  () =>
    createOpenAiResponsesAdapter(
      { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
      invalidSchemaClient,
    ),
);
