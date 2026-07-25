import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import type { EvalCase, MathItem } from "./types.js";

function readSchema(fileName: string): object {
  return JSON.parse(readFileSync(path.join(process.cwd(), "schema", fileName), "utf8"));
}

const ajv = new Ajv({ allErrors: true, strict: true });
const validateDecisionSchema = ajv.compile(readSchema("tutor-decision.schema.json"));
const validateMathItemSchema = ajv.compile(readSchema("math-item.schema.json")) as ValidateFunction<MathItem>;
const validateCaseDocumentSchema = ajv.compile(readSchema("eval-cases.schema.json")) as ValidateFunction<{ cases: EvalCase[] }>;

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`.trim()).join("; ");
}

export class ContentValidationError extends Error {
  constructor(filePath: string, errors: ErrorObject[] | null | undefined) {
    super(`Invalid content in ${filePath}: ${formatErrors(errors)}`);
    this.name = "ContentValidationError";
  }
}

export function validateDecision(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validateDecisionSchema(value);
  return { valid: Boolean(valid), errors: validateDecisionSchema.errors ?? [] };
}

export function assertValidMathItem(value: unknown, filePath: string): asserts value is MathItem {
  if (!validateMathItemSchema(value)) {
    throw new ContentValidationError(filePath, validateMathItemSchema.errors);
  }
}

export function assertValidCaseDocument(value: unknown, filePath: string): asserts value is { cases: EvalCase[] } {
  if (!validateCaseDocumentSchema(value)) {
    throw new ContentValidationError(filePath, validateCaseDocumentSchema.errors);
  }
}
