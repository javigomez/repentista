import type { GenerationBrief } from "../../domain/generation-brief/index.js";
import type { GenerateArgs } from "./main.js";

export type GenerateApplication = (
  brief: GenerationBrief,
  provider: GenerateArgs["provider"],
) => Record<string, unknown>;

export interface ProviderAdapter {
  readonly name: string;
  generate(brief: GenerationBrief): Promise<Record<string, unknown>>;
}

export function createProviderAdapter(
  provider: GenerateArgs["provider"],
): ProviderAdapter {
  switch (provider) {
    case "openai":
      return {
        name: "openai",
        async generate(_brief: GenerationBrief) {
          throw new Error("OpenAI adapter not implemented yet");
        },
      };
    case "opencode":
      return {
        name: "opencode",
        async generate(_brief: GenerationBrief) {
          throw new Error("OpenCode adapter not implemented yet");
        },
      };
  }
}

export function createGenerateApplication(
  provider: GenerateArgs["provider"],
): GenerateApplication {
  const adapter = createProviderAdapter(provider);

  return (
    brief: GenerationBrief,
    _provider: string,
  ): Record<string, unknown> => {
    // The adapter is selected once at composition time.
    // The use case receives the adapter and the brief.
    // Provider selection is confined to infrastructure.
    void adapter; // Will be used when GenerateQuatrains use case is implemented
    void brief;
    return {
      finalists: [],
      summary: { totalCandidates: 0, finalistsSelected: 0 },
    };
  };
}
