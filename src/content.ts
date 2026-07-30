import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { assertValidCaseDocument, assertValidMathItem } from "./schema.js";
import type { EvalCase, MathItem } from "./types.js";

export async function loadYamlFile(filePath: string): Promise<unknown> {
  return parse(await readFile(filePath, "utf8"));
}

export async function loadItems(itemsRoot = path.join(process.cwd(), "content", "items")): Promise<MathItem[]> {
  const languages = await readdir(itemsRoot, { withFileTypes: true });
  const files = languages
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(itemsRoot, entry.name));

  const items: MathItem[] = [];
  for (const directory of files) {
    const itemFiles = await readdir(directory, { withFileTypes: true });
    for (const entry of itemFiles.filter((candidate) => candidate.isFile() && /\.ya?ml$/u.test(candidate.name))) {
      const filePath = path.join(directory, entry.name);
      const document = await loadYamlFile(filePath);
      assertValidMathItem(document, filePath);
      items.push(document);
    }
  }
  return items;
}

export async function loadCases(casesPath = path.join(process.cwd(), "cases", "base-cases.yaml")): Promise<EvalCase[]> {
  const document = await loadYamlFile(casesPath);
  assertValidCaseDocument(document, casesPath);
  return document.cases;
}

export function validateContentRelations(items: MathItem[], cases: EvalCase[]): void {
  const errors: string[] = [];
  const itemsById = new Map<string, MathItem>();
  const caseIds = new Set<string>();

  for (const item of items) {
    if (itemsById.has(item.id)) errors.push(`duplicate item ID: ${item.id}`);
    itemsById.set(item.id, item);
    const mistakeIds = new Set<string>();
    for (const mistake of item.common_mistakes) {
      if (mistakeIds.has(mistake.id)) errors.push(`${item.id}: duplicate common_mistake ID: ${mistake.id}`);
      mistakeIds.add(mistake.id);
    }
  }

  for (const testCase of cases) {
    if (caseIds.has(testCase.case_id)) errors.push(`duplicate case ID: ${testCase.case_id}`);
    caseIds.add(testCase.case_id);
    const item = itemsById.get(testCase.problem_id);
    if (!item) {
      errors.push(`${testCase.case_id}: problem_id ${testCase.problem_id} does not exist`);
      continue;
    }
    if (item.language !== testCase.language) {
      errors.push(`${testCase.case_id}: language ${testCase.language} does not match item language ${item.language}`);
    }
    const knownMistakeIds = new Set(item.common_mistakes.map((mistake) => mistake.id));
    if (testCase.expected_assessment === "common_mistake" && !testCase.expected_mistake_id) {
      errors.push(`${testCase.case_id}: common_mistake requires expected_mistake_id`);
    }
    if (testCase.expected_assessment !== "common_mistake" && testCase.expected_mistake_id) {
      errors.push(`${testCase.case_id}: expected_mistake_id is only allowed for common_mistake`);
    }
    if (testCase.expected_mistake_id && !knownMistakeIds.has(testCase.expected_mistake_id)) {
      errors.push(`${testCase.case_id}: expected_mistake_id ${testCase.expected_mistake_id} is not defined for ${item.id}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid content relationships: ${errors.join("; ")}`);
  }
}

/**
 * `cases/base-cases.yaml` is the active set used for paid model comparisons.
 * It may only contain reviewed scenarios for approved, licence-clear items.
 */
export function validateActiveEvaluationSet(items: MathItem[], cases: EvalCase[]): void {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const errors: string[] = [];

  for (const testCase of cases) {
    const item = itemsById.get(testCase.problem_id);
    if (!item) continue; // The relation validator reports this more specifically.
    if (testCase.review_status !== "approved") {
      errors.push(`${testCase.case_id}: active evaluation cases must have review_status: approved`);
    }
    if (item.review_status !== "approved" || item.license_status !== "clear") {
      errors.push(
        `${testCase.case_id}: ${item.id} is not eligible for the active evaluation set ` +
        `(review_status=${item.review_status}, license_status=${item.license_status})`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Active evaluation set is incomplete: ${errors.join("; ")}`);
  }
}

export function selectedApprovedItems(items: MathItem[]): MathItem[] {
  return items.filter((item) => item.review_status === "approved" && item.license_status === "clear");
}
