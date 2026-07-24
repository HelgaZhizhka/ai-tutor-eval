import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ModelRunResult } from "./types.js";

function csvValue(value: string | number | boolean | undefined): string {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function writeRawResult(result: ModelRunResult): Promise<void> {
  const outputDirectory = path.join(process.cwd(), "results", "raw");
  await mkdir(outputDirectory, { recursive: true });
  const file = path.join(outputDirectory, `runs-${result.timestamp.slice(0, 10)}.jsonl`);
  await appendFile(file, `${JSON.stringify(result)}\n`, "utf8");
}

export async function writeSummary(results: ModelRunResult[], label: string): Promise<string> {
  const outputDirectory = path.join(process.cwd(), "results");
  await mkdir(outputDirectory, { recursive: true });
  const file = path.join(outputDirectory, `${label}-summary.csv`);
  const rows = [
    ["model", "case_id", "critical_failure", "assessment_match", "mistake_id_match", "answer_leakage", "latency_ms", "input_tokens", "output_tokens", "cost_usd", "provider", "generation_id", "error"],
    ...results.map((result) => [
      result.model,
      result.case_id,
      result.assertions.some((assertion) => assertion.severity === "gate" && !assertion.passed),
      result.assertions.find((assertion) => assertion.id === "A0-assessment")?.passed,
      result.assertions.find((assertion) => assertion.id === "A4-mistake-id")?.passed,
      result.assertions.find((assertion) => assertion.id === "A6-answer-leakage")?.passed,
      result.latency_ms,
      result.input_tokens,
      result.output_tokens,
      result.cost_usd,
      result.provider_name,
      result.generation_id,
      result.error
    ])
  ];
  await writeFile(file, `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`, "utf8");
  return file;
}
