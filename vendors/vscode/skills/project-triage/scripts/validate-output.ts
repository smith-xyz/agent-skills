import { Database } from "bun:sqlite";
import { resolve } from "path";
import { triageDb, scriptsDir } from "./paths";

const SCHEMAS_DIR = resolve(scriptsDir(), "schemas");

interface ValidationError {
  type: "schema" | "missing_item" | "invalid_label" | "parse" | "semantic";
  detail: string;
}

type SchemaNode = {
  type?: string | string[];
  enum?: (string | number)[];
  required?: string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  additionalProperties?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  minItems?: number;
};

function validateNode(value: unknown, schema: SchemaNode, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined) {
    if (schema.type && !arrayify(schema.type).includes("null")) {
      errors.push({ type: "schema", detail: `${path}: expected ${schema.type}, got null` });
    }
    return errors;
  }

  if (schema.type) {
    const types = arrayify(schema.type);
    const actual = Array.isArray(value) ? "array" : typeof value;
    if (actual === "number" && types.includes("integer")) {
      if (!Number.isInteger(value)) {
        errors.push({ type: "schema", detail: `${path}: expected integer, got float` });
      }
    } else if (!types.includes(actual) && !(actual === "number" && types.includes("integer"))) {
      errors.push({ type: "schema", detail: `${path}: expected ${types.join("|")}, got ${actual}` });
      return errors;
    }
  }

  if (schema.enum && !schema.enum.includes(value as string | number)) {
    errors.push({ type: "schema", detail: `${path}: value "${value}" not in enum [${schema.enum.join(", ")}]` });
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ type: "schema", detail: `${path}: ${value} < minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ type: "schema", detail: `${path}: ${value} > maximum ${schema.maximum}` });
    }
  }

  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({ type: "schema", detail: `${path}: string length ${value.length} < minLength ${schema.minLength}` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ type: "schema", detail: `${path}: array length ${value.length} < minItems ${schema.minItems}` });
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        errors.push(...validateNode(value[i], schema.items, `${path}[${i}]`));
      }
    }
  }

  if (typeof value === "object" && !Array.isArray(value) && schema.properties) {
    const obj = value as Record<string, unknown>;

    for (const key of schema.required ?? []) {
      if (!(key in obj)) {
        errors.push({ type: "schema", detail: `${path}: missing required field "${key}"` });
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in schema.properties)) {
          errors.push({ type: "schema", detail: `${path}: unexpected field "${key}"` });
        }
      }
    }

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in obj) {
        errors.push(...validateNode(obj[key], propSchema, `${path}.${key}`));
      }
    }
  }

  return errors;
}

function arrayify(t: string | string[]): string[] {
  return Array.isArray(t) ? t : [t];
}

function validateCompleteness(
  data: { items: Array<{ number: number }> },
  deltaNumbers: number[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const outputNumbers = new Set(data.items.map((i) => i.number));

  for (const num of deltaNumbers) {
    if (!outputNumbers.has(num)) {
      errors.push({ type: "missing_item", detail: `Item #${num} from delta not in output` });
    }
  }
  return errors;
}

function validateLabels(
  data: { items: Array<{ number: number; add_labels?: string[]; remove_labels?: string[] }> },
  validLabels: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const item of data.items) {
    for (const label of item.add_labels ?? []) {
      if (!validLabels.has(label)) {
        errors.push({ type: "invalid_label", detail: `#${item.number}: label "${label}" does not exist in repo` });
      }
    }
    for (const label of item.remove_labels ?? []) {
      if (!validLabels.has(label)) {
        errors.push({ type: "invalid_label", detail: `#${item.number}: remove_label "${label}" does not exist in repo` });
      }
    }
  }
  return errors;
}

function validateBacklogSemantics(
  data: { items: Array<{ number: number; effort: string; confidence: number; fix_plan?: Record<string, unknown> }> }
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const item of data.items) {
    if (item.effort === "quick-fix" && item.confidence >= 0.8 && !item.fix_plan) {
      errors.push({ type: "semantic", detail: `#${item.number}: effort=quick-fix with confidence≥0.8 requires fix_plan` });
    }
  }
  return errors;
}

function validateDuplicateGroupSemantics(
  data: { duplicate_groups: Array<{ issue: number; prs: Array<{ number: number; score: number }>; winner: number }> }
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const group of data.duplicate_groups) {
    const prNumbers = group.prs.map((p) => p.number);
    if (!prNumbers.includes(group.winner)) {
      errors.push({ type: "semantic", detail: `Duplicate group for #${group.issue}: winner ${group.winner} not in prs list` });
    }
    if (group.prs.length < 2) {
      errors.push({ type: "semantic", detail: `Duplicate group for #${group.issue}: needs at least 2 PRs` });
    }
  }
  return errors;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf("{");
  if (firstBrace >= 0) return trimmed.slice(firstBrace);
  return trimmed;
}

async function main() {
  const agentName = process.argv[2];
  const outputFile = process.argv[3];
  const deltaFile = process.argv[4];

  if (!agentName || !outputFile) {
    console.error("Usage: bun validate-output.ts <agent-name> <output-file> [delta-file]");
    process.exit(1);
  }

  const schemaPath = resolve(SCHEMAS_DIR, `${agentName}.json`);
  const schema: SchemaNode = JSON.parse(await Bun.file(schemaPath).text());

  let data: unknown;
  try {
    const raw = await Bun.file(outputFile).text();
    const jsonStr = extractJson(raw);
    data = JSON.parse(jsonStr);
  } catch (e) {
    const errors: ValidationError[] = [{ type: "parse", detail: `Invalid JSON: ${(e as Error).message}` }];
    console.error(JSON.stringify({ errors }));
    process.exit(1);
  }

  const errors: ValidationError[] = [];

  // Full schema validation
  errors.push(...validateNode(data, schema, "$"));

  // Completeness check
  if (errors.length === 0 && deltaFile) {
    const delta = JSON.parse(await Bun.file(deltaFile).text());
    const key = agentName === "pr-triage" ? "prs" : "issues";
    const deltaNumbers: number[] = (delta[key] ?? []).map((i: { number: number }) => i.number);
    errors.push(...validateCompleteness(data as { items: Array<{ number: number }> }, deltaNumbers));
  }

  // Label validation (issue-triage)
  if (errors.length === 0 && agentName === "issue-triage") {
    const db = new Database(triageDb(), { readonly: true });
    const rows = db.prepare("SELECT name FROM labels").all() as Array<{ name: string }>;
    const validLabels = new Set(rows.map((r) => r.name));
    db.close();
    errors.push(...validateLabels(data as { items: Array<{ number: number; add_labels?: string[] }> }, validLabels));
  }

  // Semantic: backlog-planner fix_plan requirement
  if (errors.length === 0 && agentName === "backlog-planner") {
    errors.push(...validateBacklogSemantics(data as { items: Array<{ number: number; effort: string; confidence: number; fix_plan?: Record<string, unknown> }> }));
  }

  // Semantic: pr-triage duplicate groups
  if (errors.length === 0 && agentName === "pr-triage") {
    errors.push(...validateDuplicateGroupSemantics(data as { duplicate_groups: Array<{ issue: number; prs: Array<{ number: number; score: number }>; winner: number }> }));
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ errors }));
    process.exit(1);
  }

  console.log(JSON.stringify({ valid: true, items_count: ((data as { items: unknown[] }).items ?? []).length }));
}

main().catch((e) => {
  console.error(JSON.stringify({ errors: [{ type: "parse", detail: e.message }] }));
  process.exit(1);
});
