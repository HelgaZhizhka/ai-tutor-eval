import { describe, expect, it } from "vitest";
import { fetchModelPricing } from "../src/model-catalog.js";

describe("model catalogue pricing", () => {
  it("does not treat absent pricing as zero cost", async () => {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({
      data: [
        { id: "priced-model", pricing: { prompt: "0.000001", completion: "0.000002" } },
        { id: "missing-pricing", pricing: {} },
        { id: "free-model", pricing: { prompt: "0", completion: "0" } }
      ]
    }), { status: 200 });

    const pricing = await fetchModelPricing(["priced-model", "missing-pricing", "free-model"], fetchImpl);

    expect(pricing.get("priced-model")).toEqual({ prompt: 0.000001, completion: 0.000002 });
    expect(pricing.has("missing-pricing")).toBe(false);
    expect(pricing.get("free-model")).toEqual({ prompt: 0, completion: 0 });
  });
});
