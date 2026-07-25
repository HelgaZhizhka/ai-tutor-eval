import { describe, expect, it } from "vitest";
import { requireUniqueModels } from "../src/model-list.js";

describe("model list validation", () => {
  it("rejects duplicate models before a cost estimate is calculated", () => {
    expect(() => requireUniqueModels(["model-a", "model-a"], "shortlist")).toThrow("duplicate model IDs");
  });

  it("preserves a valid unique list", () => {
    expect(requireUniqueModels(["model-a", "model-b"], "shortlist")).toEqual(["model-a", "model-b"]);
  });
});
