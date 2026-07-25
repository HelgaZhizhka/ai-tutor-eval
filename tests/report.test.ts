import { describe, expect, it } from "vitest";
import { buildModelScorecardRows } from "../src/report.js";
import type { ModelRunResult } from "../src/types.js";

const successfulRun: ModelRunResult = {
  run_id: "run-1",
  timestamp: "2026-07-25T00:00:00.000Z",
  model: "model-a",
  prompt_version: "tutor.v2",
  case_id: "case-1",
  repeat_index: 1,
  decision: null,
  raw_content: "",
  latency_ms: 100,
  request_attempts: 1,
  assertions: [{ id: "A1-schema", passed: true, severity: "gate", message: "ok" }]
};

describe("model scorecard", () => {
  it("reports infrastructure errors separately from behavioural gate failures", () => {
    const infrastructureFailure: ModelRunResult = {
      ...successfulRun,
      run_id: "run-2",
      case_id: "case-2",
      request_attempts: 3,
      infrastructure_error: true,
      error: "OpenRouter request failed (429)"
    };
    const [row] = buildModelScorecardRows([successfulRun, infrastructureFailure]);
    expect(row).toMatchObject({
      runs: 2,
      completedRuns: 1,
      infrastructureErrors: 1,
      gatePassRate: "1/1 (100.0%)"
    });
  });
});
