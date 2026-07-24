import { readFileSync } from "node:fs";
import path from "node:path";
import { Ajv, type ErrorObject } from "ajv";

const schemaPath = path.join(process.cwd(), "schema", "tutor-decision.schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

export function validateDecision(value: unknown): { valid: boolean; errors: ErrorObject[] } {
  const valid = validate(value);
  return { valid: Boolean(valid), errors: validate.errors ?? [] };
}
