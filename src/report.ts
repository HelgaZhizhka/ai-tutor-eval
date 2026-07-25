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
    ["model", "case_id", "repeat_index", "critical_failure", "assessment_match", "mistake_id_match", "answer_leakage", "latency_ms", "input_tokens", "output_tokens", "cost_usd", "provider", "generation_id", "error"],
    ...results.map((result) => [
      result.model,
      result.case_id,
      result.repeat_index,
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

function assertionPassed(result: ModelRunResult, id: string): boolean | undefined {
  return result.assertions.find((assertion) => assertion.id === id)?.passed;
}

function percentile(values: number[], percent: number): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((percent / 100) * sorted.length) - 1))];
}

function rateLabel(values: boolean[]): string {
  if (values.length === 0) return "n/a";
  const passed = values.filter(Boolean).length;
  return `${passed}/${values.length} (${((passed / values.length) * 100).toFixed(1)}%)`;
}

export async function writeModelScorecard(results: ModelRunResult[], label: string): Promise<string> {
  const outputDirectory = path.join(process.cwd(), "results");
  await mkdir(outputDirectory, { recursive: true });
  const file = path.join(outputDirectory, `${label}-model-scorecard.csv`);
  const models = [...new Set(results.map((result) => result.model))];
  const rows = [
    ["model", "runs", "gate_pass_rate", "assessment_accuracy", "mistake_id_accuracy", "answer_leakage_failures", "p50_latency_ms", "p95_latency_ms", "total_cost_usd", "providers"],
    ...models.map((model) => {
      const modelResults = results.filter((result) => result.model === model);
      const gatePasses = modelResults.map((result) => !result.error && !result.assertions.some((assertion) => assertion.severity === "gate" && !assertion.passed));
      const assessmentMatches = modelResults.map((result) => assertionPassed(result, "A0-assessment")).filter((value): value is boolean => value !== undefined);
      const mistakeMatches = modelResults.map((result) => assertionPassed(result, "A4-mistake-id")).filter((value): value is boolean => value !== undefined);
      const leakageFailures = modelResults.filter((result) => assertionPassed(result, "A6-answer-leakage") === false).length;
      const latencies = modelResults.map((result) => result.latency_ms).filter((value) => Number.isFinite(value));
      const providers = [...new Set(modelResults.map((result) => result.provider_name).filter(Boolean))].join(" | ");
      const totalCost = modelResults.reduce((sum, result) => sum + (result.cost_usd ?? 0), 0);
      return [
        model,
        modelResults.length,
        rateLabel(gatePasses),
        rateLabel(assessmentMatches),
        rateLabel(mistakeMatches),
        leakageFailures,
        percentile(latencies, 50),
        percentile(latencies, 95),
        totalCost.toFixed(6),
        providers
      ];
    })
  ];
  await writeFile(file, `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`, "utf8");
  return file;
}
