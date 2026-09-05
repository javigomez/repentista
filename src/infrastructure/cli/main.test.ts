import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  runCli,
  parseGenerateArgs,
  parseGenerateFile,
  generateQuatrains,
  runGenerateCommand,
} from "./main.js";
import type { GenerationBrief } from "../../domain/generation-brief/index.js";

test("the CLI composition root delegates to the application handler", () => {
  let calls = 0;

  runCli(() => {
    calls += 1;
  });

  assert.equal(calls, 1);
});

describe("generate CLI argument parsing", () => {
  it("translates context and options into a brief", () => {
    const result = parseGenerateArgs([
      "generate",
      "--context",
      "  egoísmo ",
      "--provider",
      "opencode",
      "--top-k",
      "2",
    ]);
    assert.deepEqual(result, {
      ok: true,
      provider: "opencode",
      brief: {
        context: "egoísmo",
        tone: "",
        candidateCount: 100,
        topK: 2,
        minimumScore: 80,
        scheme: "0-A-0-A",
        rhyme: "consonant",
        metricPositions: 7,
        verseRetryBudget: 3,
        llmCallBudget: 200,
      },
    });
  });

  it("accepts context as a positional argument and reports invalid options", () => {
    const positional = parseGenerateArgs([
      "generate",
      "compartir conserva la amistad",
    ]);
    assert.equal(positional.ok, true);
    const invalid = parseGenerateArgs(["generate", "--top-k", "no"]);
    assert.equal(invalid.ok, false);
    if (invalid.ok) throw new Error("expected invalid arguments");
    assert.equal(invalid.errors[0]?.code, "INVALID_ARGUMENT");
  });
});

describe("generate CLI defaults", () => {
  it("applies default provider openai when not specified", () => {
    const result = parseGenerateArgs(["generate", "un tema"]);
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected valid args");
    assert.equal(result.provider, "openai");
  });

  it("applies default brief values when only context is provided", () => {
    const result = parseGenerateArgs(["generate", "un tema"]);
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected valid args");
    assert.equal(result.brief.tone, "");
    assert.equal(result.brief.candidateCount, 100);
    assert.equal(result.brief.topK, 5);
    assert.equal(result.brief.minimumScore, 80);
    assert.equal(result.brief.scheme, "0-A-0-A");
    assert.equal(result.brief.rhyme, "consonant");
    assert.equal(result.brief.metricPositions, 7);
  });
});

describe("generate CLI provider selection", () => {
  it("accepts openai as provider", () => {
    const result = parseGenerateArgs([
      "generate",
      "tema",
      "--provider",
      "openai",
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected valid args");
    assert.equal(result.provider, "openai");
  });

  it("accepts opencode as provider", () => {
    const result = parseGenerateArgs([
      "generate",
      "tema",
      "--provider",
      "opencode",
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected valid args");
    assert.equal(result.provider, "opencode");
  });

  it("rejects an unsupported provider", () => {
    const result = parseGenerateArgs([
      "generate",
      "tema",
      "--provider",
      "anthropic",
    ]);
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected invalid args");
    assert.equal(result.errors[0]?.code, "INVALID_ARGUMENT");
  });
});

describe("generate CLI file context", () => {
  const tmpDir = join(import.meta.dirname ?? ".", "__tmp-file-context-test");

  async function writeFileContext(
    name: string,
    content: unknown,
  ): Promise<string> {
    await mkdir(tmpDir, { recursive: true });
    const path = join(tmpDir, name);
    await writeFile(path, JSON.stringify(content), "utf8");
    return path;
  }

  it("reads context from a JSON file", async () => {
    const path = await writeFileContext("valid.json", {
      context: "la avaricia rompe el saco",
    });
    try {
      const result = await parseGenerateFile(path);
      assert.equal(result.ok, true);
      if (!result.ok) throw new Error("expected valid parse");
      assert.equal(result.brief.context, "la avaricia rompe el saco");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("rejects a file with missing context field", async () => {
    const path = await writeFileContext("no-context.json", {
      tone: "humorístico",
    });
    try {
      const result = await parseGenerateFile(path);
      assert.equal(result.ok, false);
      if (result.ok) throw new Error("expected invalid parse");
      assert.equal(result.errors[0]?.code, "EMPTY_CONTEXT");
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("generate CLI JSON finalist output", () => {
  interface FakeFinalist {
    readonly id: string;
    readonly verses: readonly string[];
    readonly score: number;
  }

  interface FakeGenerateResult {
    readonly finalists: readonly FakeFinalist[];
    readonly summary: {
      readonly totalCandidates: number;
      readonly finalistsSelected: number;
    };
  }

  function fakeHandler(result: FakeGenerateResult) {
    return (
      _brief: GenerationBrief,
      _provider: string,
    ): Record<string, unknown> => result as unknown as Record<string, unknown>;
  }

  it("produces JSON with finalists, traceability and summary on success", () => {
    const fakeResult: FakeGenerateResult = {
      finalists: [
        {
          id: "c-001",
          verses: ["V1 text", "V2 text", "V3 text", "V4 text"],
          score: 86,
        },
      ],
      summary: { totalCandidates: 10, finalistsSelected: 1 },
    };

    const output = generateQuatrains(
      ["generate", "egoísmo", "--provider", "opencode"],
      fakeHandler(fakeResult),
    );

    const parsed: unknown = JSON.parse(output);
    assert.ok(
      typeof parsed === "object" && parsed !== null,
      "output must be a JSON object",
    );
    const obj = parsed as Record<string, unknown>;

    assert.ok(Array.isArray(obj.finalists), "must include finalists array");
    assert.equal((obj.finalists as unknown[]).length, 1);
    assert.deepEqual(obj.summary, {
      totalCandidates: 10,
      finalistsSelected: 1,
    });
    assert.ok(obj.brief !== undefined, "must include brief for traceability");
    assert.ok(
      obj.provider !== undefined,
      "must include provider for traceability",
    );
  });

  it("represents partial results when fewer than top-K survive", () => {
    const fakeResult: FakeGenerateResult = {
      finalists: [
        { id: "c-001", verses: ["V1", "V2", "V3", "V4"], score: 82 },
        { id: "c-002", verses: ["V1b", "V2b", "V3b", "V4b"], score: 80 },
      ],
      summary: { totalCandidates: 20, finalistsSelected: 2 },
    };

    const output = generateQuatrains(
      ["generate", "tema", "--top-k", "5"],
      fakeHandler(fakeResult),
    );

    const parsed = JSON.parse(output) as Record<string, unknown>;
    assert.equal((parsed.finalists as unknown[]).length, 2);
    assert.equal(
      (parsed.summary as Record<string, unknown>).finalistsSelected,
      2,
    );
  });

  it("represents empty results explicitly", () => {
    const fakeResult: FakeGenerateResult = {
      finalists: [],
      summary: { totalCandidates: 50, finalistsSelected: 0 },
    };

    const output = generateQuatrains(
      ["generate", "tema"],
      fakeHandler(fakeResult),
    );

    const parsed = JSON.parse(output) as Record<string, unknown>;
    assert.deepEqual(parsed.finalists, []);
    assert.equal(
      (parsed.summary as Record<string, unknown>).finalistsSelected,
      0,
    );
  });
});

describe("generate CLI error handling and exit codes", () => {
  interface FakeFinalist {
    readonly id: string;
    readonly verses: readonly string[];
    readonly score: number;
  }

  interface FakeGenerateResult {
    readonly finalists: readonly FakeFinalist[];
    readonly summary: {
      readonly totalCandidates: number;
      readonly finalistsSelected: number;
    };
  }

  function fakeHandler(result: FakeGenerateResult) {
    return (
      _brief: GenerationBrief,
      _provider: string,
    ): Record<string, unknown> => result as unknown as Record<string, unknown>;
  }

  it("returns exit code 1 and stderr diagnostics when context is missing", () => {
    const result = runGenerateCommand(
      ["generate", ""],
      fakeHandler({
        finalists: [],
        summary: { totalCandidates: 0, finalistsSelected: 0 },
      }),
    );

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.length > 0, "stderr must explain the error");
    assert.ok(
      result.stderr.includes("contexto"),
      "stderr must mention the missing context",
    );
  });

  it("returns exit code 1 and stderr when --top-k is not numeric", () => {
    const result = runGenerateCommand(
      ["generate", "tema", "--top-k", "abc"],
      fakeHandler({
        finalists: [],
        summary: { totalCandidates: 0, finalistsSelected: 0 },
      }),
    );

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(
      result.stderr.includes("numérico"),
      "stderr must explain the numeric requirement",
    );
  });

  it("returns exit code 1 and stderr when provider is unsupported", () => {
    const result = runGenerateCommand(
      ["generate", "tema", "--provider", "unknown"],
      fakeHandler({
        finalists: [],
        summary: { totalCandidates: 0, finalistsSelected: 0 },
      }),
    );

    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(
      result.stderr.includes("provider"),
      "stderr must mention the provider issue",
    );
  });

  it("returns exit code 2 and stderr when the application handler throws", () => {
    const throwingHandler = (
      _brief: GenerationBrief,
      _provider: string,
    ): Record<string, unknown> => {
      throw new Error("provider unavailable");
    };

    const result = runGenerateCommand(["generate", "tema"], throwingHandler);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stdout, "");
    assert.ok(
      result.stderr.includes("provider unavailable"),
      "stderr must include the error message",
    );
  });

  it("returns exit code 0 and JSON stdout on successful generation", () => {
    const fakeResult: FakeGenerateResult = {
      finalists: [{ id: "c-001", verses: ["V1", "V2", "V3", "V4"], score: 85 }],
      summary: { totalCandidates: 5, finalistsSelected: 1 },
    };

    const result = runGenerateCommand(
      ["generate", "tema"],
      fakeHandler(fakeResult),
    );

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal((parsed.finalists as unknown[]).length, 1);
  });

  it("returns exit code 0 for empty finalists (explicit empty result)", () => {
    const fakeResult: FakeGenerateResult = {
      finalists: [],
      summary: { totalCandidates: 50, finalistsSelected: 0 },
    };

    const result = runGenerateCommand(
      ["generate", "tema"],
      fakeHandler(fakeResult),
    );

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.deepEqual(parsed.finalists, []);
  });
});

describe("composition root provider selection", () => {
  it("selects provider adapter based on CLI argument, not in use case", () => {
    // The composition root receives the provider from CLI args
    // and creates the appropriate adapter. The use case receives
    // the adapter and the brief, but does not know about provider selection.
    const openaiResult = runGenerateCommand(
      ["generate", "tema", "--provider", "openai"],
      (brief, provider) => {
        // The provider is passed to the use case, but the use case
        // should not select adapters based on it. The adapter is
        // already selected by the composition root.
        assert.equal(provider, "openai");
        return {
          finalists: [],
          summary: { totalCandidates: 0, finalistsSelected: 0 },
          brief,
          provider,
        };
      },
    );

    const opencodeResult = runGenerateCommand(
      ["generate", "tema", "--provider", "opencode"],
      (brief, provider) => {
        assert.equal(provider, "opencode");
        return {
          finalists: [],
          summary: { totalCandidates: 0, finalistsSelected: 0 },
          brief,
          provider,
        };
      },
    );

    assert.equal(openaiResult.exitCode, 0);
    assert.equal(opencodeResult.exitCode, 0);

    const openaiOutput = JSON.parse(openaiResult.stdout) as Record<
      string,
      unknown
    >;
    const opencodeOutput = JSON.parse(opencodeResult.stdout) as Record<
      string,
      unknown
    >;

    assert.equal(openaiOutput.provider, "openai");
    assert.equal(opencodeOutput.provider, "opencode");
  });
});

describe("stable JSON rendering and output policy", () => {
  it("produces deterministic JSON output for the same input", () => {
    const fakeResult = {
      finalists: [{ id: "c-001", verses: ["V1", "V2", "V3", "V4"], score: 85 }],
      summary: { totalCandidates: 5, finalistsSelected: 1 },
    };

    const handler = (
      _brief: GenerationBrief,
      _provider: string,
    ): Record<string, unknown> =>
      fakeResult as unknown as Record<string, unknown>;

    const first = runGenerateCommand(["generate", "tema"], handler);
    const second = runGenerateCommand(["generate", "tema"], handler);

    assert.equal(
      first.stdout,
      second.stdout,
      "JSON output must be deterministic",
    );
  });

  it("omits API keys and secrets from the output", () => {
    const handler = (
      _brief: GenerationBrief,
      _provider: string,
    ): Record<string, unknown> => ({
      finalists: [],
      summary: { totalCandidates: 0, finalistsSelected: 0 },
      // Simulate a handler that accidentally includes secrets
      apiKey: "sk-secret-123",
      prompt: "You are a poet...",
    });

    const result = runGenerateCommand(["generate", "tema"], handler);
    assert.equal(result.exitCode, 0);

    const output = result.stdout;
    assert.ok(
      !output.includes("sk-secret-123"),
      "output must not contain API keys",
    );
    assert.ok(
      !output.includes("You are a poet"),
      "output must not contain prompts",
    );
  });

  it("includes brief and provider for traceability but omits internal prompts", () => {
    const handler = (
      brief: GenerationBrief,
      provider: string,
    ): Record<string, unknown> => ({
      finalists: [],
      summary: { totalCandidates: 0, finalistsSelected: 0 },
      brief,
      provider,
    });

    const result = runGenerateCommand(
      ["generate", "tema", "--provider", "opencode"],
      handler,
    );
    assert.equal(result.exitCode, 0);

    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.ok(
      parsed.brief !== undefined,
      "must include brief for traceability",
    );
    assert.ok(
      parsed.provider !== undefined,
      "must include provider for traceability",
    );
    assert.equal(parsed.provider, "opencode");
  });
});
