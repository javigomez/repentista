import type { ApplicationHandler } from "../../application/application-handler.js";
import { readFile } from "node:fs/promises";
import {
  createGenerationBrief,
  type GenerationBrief,
  type GenerationBriefInput,
} from "../../domain/generation-brief/index.js";

export interface GenerateArgs {
  readonly provider: "openai" | "opencode";
  readonly brief: GenerationBrief;
}

export type ParseResult =
  | {
      readonly ok: true;
      readonly provider: GenerateArgs["provider"];
      readonly brief: GenerationBrief;
    }
  | {
      readonly ok: false;
      readonly errors: readonly {
        readonly code: string;
        readonly message: string;
      }[];
    };

const defaults = { provider: "openai" as const };

export function parseGenerateArgs(argv: readonly string[]): ParseResult {
  if (argv[0] !== "generate")
    return {
      ok: false,
      errors: [
        { code: "INVALID_ARGUMENT", message: "El comando debe ser generate." },
      ],
    };
  const input: {
    -readonly [K in keyof GenerationBriefInput]: GenerationBriefInput[K];
  } = { context: "" };
  let provider: GenerateArgs["provider"] = defaults.provider;
  const positional: string[] = [];
  const values: Record<string, string> = {};
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--"))
      return {
        ok: false,
        errors: [
          { code: "INVALID_ARGUMENT", message: `Falta valor para --${key}.` },
        ],
      };
    values[key] = value;
    i += 1;
  }
  if (values.context !== undefined && positional.length > 0)
    return {
      ok: false,
      errors: [
        {
          code: "INVALID_ARGUMENT",
          message: "Usa contexto por argumento o posición, no ambos.",
        },
      ],
    };
  input.context = values.context ?? positional.join(" ");
  if (values.provider !== undefined) {
    if (values.provider !== "openai" && values.provider !== "opencode")
      return {
        ok: false,
        errors: [
          {
            code: "INVALID_ARGUMENT",
            message: "provider debe ser openai u opencode.",
          },
        ],
      };
    provider = values.provider;
  }
  const numeric = {
    "candidate-count": "candidateCount",
    "top-k": "topK",
    "minimum-score": "minimumScore",
  } as const;
  for (const [flag, field] of Object.entries(numeric) as [
    keyof typeof numeric,
    (typeof numeric)[keyof typeof numeric],
  ][])
    if (values[flag] !== undefined) {
      const number = Number(values[flag]);
      if (!Number.isFinite(number))
        return {
          ok: false,
          errors: [
            {
              code: "INVALID_ARGUMENT",
              message: `--${flag} debe ser numérico.`,
            },
          ],
        };
      if (field === "candidateCount") input.candidateCount = number;
      else if (field === "topK") input.topK = number;
      else input.minimumScore = number;
    }
  if (values.tone !== undefined) input.tone = values.tone;
  const brief = createGenerationBrief(input);
  return brief.ok
    ? { ok: true, provider, brief: brief.value }
    : { ok: false, errors: brief.errors };
}

export function runCli(application: ApplicationHandler): void {
  application();
}

export function main(): void {
  runCli(() => undefined);
}

export async function parseGenerateFile(path: string): Promise<ParseResult> {
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null)
    return {
      ok: false,
      errors: [
        {
          code: "INVALID_ARGUMENT",
          message: "El fichero debe contener un objeto JSON.",
        },
      ],
    };
  const record = parsed as Record<string, unknown>;
  const args = [
    "generate",
    "--context",
    typeof record.context === "string" ? record.context : "",
  ];
  return parseGenerateArgs(args);
}

export type GenerateApplication = (
  brief: GenerationBrief,
  provider: GenerateArgs["provider"],
) => Record<string, unknown>;

export function generateQuatrains(
  argv: readonly string[],
  application: GenerateApplication,
): string {
  const parsed = parseGenerateArgs(argv);

  if (!parsed.ok) {
    return JSON.stringify({ ok: false, errors: parsed.errors });
  }

  const result = application(parsed.brief, parsed.provider);

  return JSON.stringify({
    ok: true,
    finalists: result.finalists ?? [],
    summary: result.summary ?? {},
    brief: parsed.brief,
    provider: parsed.provider,
  });
}

export interface GenerateCommandResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export function runGenerateCommand(
  argv: readonly string[],
  application: GenerateApplication,
): GenerateCommandResult {
  const parsed = parseGenerateArgs(argv);

  if (!parsed.ok) {
    const diagnostics = parsed.errors
      .map((e) => `[${e.code}] ${e.message}`)
      .join("\n");
    return { stdout: "", stderr: diagnostics, exitCode: 1 };
  }

  try {
    const result = application(parsed.brief, parsed.provider);

    const output = JSON.stringify({
      ok: true,
      finalists: result.finalists ?? [],
      summary: result.summary ?? {},
      brief: parsed.brief,
      provider: parsed.provider,
    });

    return { stdout: output, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { stdout: "", stderr: message, exitCode: 2 };
  }
}
