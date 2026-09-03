import { readFileSync } from "node:fs";
import type { ApplicationHandler } from "../../application/application-handler.js";
import { readFile } from "node:fs/promises";
import {
  createGenerationBrief,
  type GenerationBrief,
  type GenerationBriefInput,
} from "../../domain/generation-brief/index.js";
import {
  validateCandidate,
  type ValidateCandidateRequest,
} from "../../application/validate-candidate/index.js";
import { runInspectRhymesCommand } from "./commands/inspect-rhymes.js";
import { createWeiweiSilabacionWordAnalyzer } from "../weiwei-silabacion/word-analysis-adapter.js";
import { createVersionedDictionaryJsonLoader } from "../content/versioned-dictionary-json.js";
import { join } from "node:path";

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

interface ParsedArgs {
  readonly command: string | undefined;
  readonly inputSource: string | undefined;
  readonly dictionaryVersion: string | undefined;
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const args = argv.slice(2);
  let command: string | undefined;
  let inputSource: string | undefined;
  let dictionaryVersion: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--dictionary" && i + 1 < args.length) {
      dictionaryVersion = args[++i];
    } else if (command === undefined) {
      command = arg;
    } else if (inputSource === undefined) {
      inputSource = arg;
    }
  }

  return { command, inputSource, dictionaryVersion };
}

function readInput(inputSource: string | undefined): string {
  if (inputSource === undefined || inputSource === "-") {
    return readFileSync(0, "utf8");
  }

  return readFileSync(inputSource, "utf8");
}

function handleValidateCandidate(
  inputSource: string | undefined,
  dictionaryVersion: string | undefined,
): void {
  let rawInput: string;

  try {
    rawInput = readInput(inputSource);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      JSON.stringify({ code: "INVALID_CONTRACT", message }) + "\n",
    );
    process.exit(1);
    return;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawInput);
  } catch {
    process.stderr.write(
      JSON.stringify({
        code: "INVALID_CONTRACT",
        message: "La entrada no es un JSON válido.",
      }) + "\n",
    );
    process.exit(1);
    return;
  }

  const request: ValidateCandidateRequest = {
    input: parsed,
    dictionaryVersion: dictionaryVersion ?? "dict-0.1.0",
  };

  const result = validateCandidate(request);

  if (!result.ok) {
    process.stderr.write(JSON.stringify(result.error) + "\n");
    process.exit(1);
    return;
  }

  process.stdout.write(JSON.stringify(result.report) + "\n");

  if (result.report.verdict !== "VALIDO") {
    process.exit(1);
  }
}

const INSPECT_RHYMES_USAGE = `Usage: repentista inspect-rhymes [options]

Options:
  --word, -w <word>                    Word to inspect (required)
  --dictionary-version, -d <version>   Dictionary version (required)
  --category, -c <category>            Filter by category
  --role, -r <role>                    Filter by role (PREPARATION, PUNCHLINE)
`;

async function inspectRhymesCommand(argv: readonly string[]): Promise<number> {
  const dictionaryPath = join(
    process.cwd(),
    "data",
    "dictionary-manifest.json",
  );

  const loader = createVersionedDictionaryJsonLoader({
    readText: (logicalPath) => readFile(logicalPath, "utf-8"),
  });

  const wordArg = argv.find(
    (_, i, arr) => arr[i - 1] === "--word" || arr[i - 1] === "-w",
  );
  const versionArg = argv.find(
    (_, i, arr) =>
      arr[i - 1] === "--dictionary-version" || arr[i - 1] === "-d",
  );

  if (versionArg === undefined) {
    process.stderr.write("Error: --dictionary-version is required.\n");
    process.stderr.write(INSPECT_RHYMES_USAGE);
    return 4;
  }

  const loadResult = await loader.load({
    manifestPath: dictionaryPath,
    version: versionArg,
  });

  if (!loadResult.ok) {
    process.stderr.write(
      `Error: Could not load dictionary: ${loadResult.error.code}\n`,
    );
    return 2;
  }

  const analyzer = createWeiweiSilabacionWordAnalyzer();
  const result = runInspectRhymesCommand(
    { dictionary: loadResult.snapshot.dictionary, analyzer },
    argv,
  );

  process.stdout.write(result.output + "\n");
  return result.exitCode;
}

export async function main(): Promise<void> {
  const { command, inputSource, dictionaryVersion } = parseArgs(process.argv);

  if (command === "validate-candidate") {
    handleValidateCandidate(inputSource, dictionaryVersion);
    return;
  }

  if (command === "inspect-rhymes") {
    const exitCode = await inspectRhymesCommand(process.argv.slice(3));
    process.exit(exitCode);
  }

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
