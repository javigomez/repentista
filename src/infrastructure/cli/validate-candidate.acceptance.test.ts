import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { candidateInput } from "../../domain/quatrain-candidate/test-fixtures.js";

const entrypoint = join(process.cwd(), "src/infrastructure/cli/entrypoint.ts");

function runValidateCandidate(args: readonly string[], input?: string): string {
  return execFileSync(
    process.execPath,
    ["--import", "tsx", entrypoint, "validate-candidate", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

function runValidateCandidateExpectFailure(
  args: readonly string[],
  input?: string,
): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--import", "tsx", entrypoint, "validate-candidate", ...args],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        input,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    return { stdout, stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      exitCode: execError.status ?? 1,
    };
  }
}

test.describe("validate-candidate acceptance contract", () => {
  test("reads a candidate from stdin and emits complete JSON diagnostics", () => {
    const stdout = runValidateCandidate(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(candidateInput()),
    );
    const report: unknown = JSON.parse(stdout);

    assert.deepEqual(Object.keys(report as object), [
      "candidateId",
      "verdict",
      "validators",
    ]);
    assert.equal(
      (report as { candidateId: string }).candidateId,
      "candidate-001",
    );
    assert.equal((report as { verdict: string }).verdict, "VALIDO");
    assert.deepEqual(
      (report as { validators: readonly { name: string }[] }).validators.map(
        (validator) => validator.name,
      ),
      [
        "structure",
        "metric",
        "rhyme",
        "lexicon",
        "ambiguity",
        "duplicate",
        "safety",
      ],
    );
  });

  test("reads the same candidate from a JSON file", () => {
    const tempRoot = join(process.cwd(), ".openspec-shipper/tmp");
    mkdirSync(tempRoot, { recursive: true });
    const directory = mkdtempSync(join(tempRoot, "validate-candidate-"));
    const inputPath = join(directory, "candidate.json");

    try {
      writeFileSync(inputPath, JSON.stringify(candidateInput()), "utf8");
      const stdout = runValidateCandidate([
        inputPath,
        "--dictionary",
        "dict-0.1.0",
      ]);
      const report: unknown = JSON.parse(stdout);

      assert.equal(
        (report as { candidateId: string }).candidateId,
        "candidate-001",
      );
      assert.equal((report as { verdict: string }).verdict, "VALIDO");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("rejects malformed JSON contract with explicit error and non-zero exit code", () => {
    const result = runValidateCandidateExpectFailure(
      ["-", "--dictionary", "dict-0.1.0"],
      "not valid json",
    );

    assert.notEqual(result.exitCode, 0);
    const errorReport: unknown = JSON.parse(result.stderr);
    assert.equal((errorReport as { code: string }).code, "INVALID_CONTRACT");
  });

  test("rejects contract missing required verses with explicit error", () => {
    const incompleteCandidate = {
      id: "candidate-002",
      batchId: "batch-001",
      brief: candidateInput().brief,
      plan: {
        ...candidateInput().plan,
        slots: candidateInput().plan.slots.slice(0, 2),
      },
      provenance: candidateInput().provenance,
    };

    const result = runValidateCandidateExpectFailure(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(incompleteCandidate),
    );

    assert.notEqual(result.exitCode, 0);
    const errorReport: unknown = JSON.parse(result.stderr);
    assert.equal((errorReport as { code: string }).code, "INVALID_CONTRACT");
  });

  test("reports multiple validator failures when metric and lexicon both fail", () => {
    const candidateWithMultipleIssues = {
      ...candidateInput(),
      plan: {
        ...candidateInput().plan,
        slots: candidateInput().plan.slots.map((slot) => ({
          ...slot,
          plannedFinalWord: "xyznotaword",
        })),
      },
    };

    const result = runValidateCandidateExpectFailure(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(candidateWithMultipleIssues),
    );

    assert.notEqual(result.exitCode, 0);
    const report: unknown = JSON.parse(result.stdout);
    const validators = (
      report as { validators: readonly { name: string; verdict: string }[] }
    ).validators;
    const failedValidators = validators.filter((v) => v.verdict !== "VALIDO");
    assert.ok(
      failedValidators.length >= 2,
      "Expected at least two validators to fail",
    );
  });

  test("marks omitted validators with cause when preconditions are missing", () => {
    const candidateWithMissingPreconditions = {
      ...candidateInput(),
      plan: {
        ...candidateInput().plan,
        slots: candidateInput().plan.slots.map((slot) => ({
          ...slot,
          plannedFinalWord: undefined,
        })),
      },
    };

    const result = runValidateCandidateExpectFailure(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(candidateWithMissingPreconditions),
    );

    assert.notEqual(result.exitCode, 0);
    const report: unknown = JSON.parse(result.stdout);
    const validators = (
      report as {
        validators: readonly {
          name: string;
          verdict: string;
          cause?: string;
        }[];
      }
    ).validators;
    const omittedValidators = validators.filter((v) => v.cause !== undefined);
    assert.ok(
      omittedValidators.length > 0,
      "Expected at least one omitted validator with cause",
    );
  });

  test("completes validation without LLM credentials in environment", () => {
    const stdout = runValidateCandidate(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(candidateInput()),
    );
    const report: unknown = JSON.parse(stdout);
    assert.equal((report as { verdict: string }).verdict, "VALIDO");
  });

  test("exits with non-zero code when candidate is invalid", () => {
    const invalidCandidate = {
      ...candidateInput(),
      plan: {
        ...candidateInput().plan,
        slots: candidateInput().plan.slots.map((slot) => ({
          ...slot,
          plannedFinalWord: "xyznotaword",
        })),
      },
    };

    const result = runValidateCandidateExpectFailure(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(invalidCandidate),
    );

    assert.notEqual(result.exitCode, 0);
  });

  test("exits with zero code when candidate is valid", () => {
    const stdout = runValidateCandidate(
      ["-", "--dictionary", "dict-0.1.0"],
      JSON.stringify(candidateInput()),
    );
    const report: unknown = JSON.parse(stdout);
    assert.equal((report as { verdict: string }).verdict, "VALIDO");
  });
});
