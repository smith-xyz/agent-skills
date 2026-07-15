import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import type { FieldDef, Schema, ValidationError } from "./types.ts";

const moduleDir = dirname(fileURLToPath(import.meta.url));

export function findSchemasDir(): string {
  const envDir = process.env.ARTIFACT_SCHEMAS_DIR;
  if (envDir && existsSync(envDir)) {
    return resolve(envDir);
  }

  // Walk up from module location and cwd looking for shared/schemas/
  const roots = [moduleDir, process.cwd()];
  for (const start of roots) {
    let dir = start;
    for (let i = 0; i < 10; i++) {
      const candidate = join(dir, "shared", "schemas");
      if (existsSync(candidate)) {
        return candidate;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  // Check well-known workspace paths (compiled binary may not resolve relative to source)
  const wellKnown = [
    join(process.env.HOME ?? "", "rh", "smith-xyz", "agent-skills", "shared", "schemas"),
  ];
  for (const candidate of wellKnown) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Could not locate shared/schemas/ — set ARTIFACT_SCHEMAS_DIR");
}

function parseSchemaFile(path: string): Schema {
  const raw = yaml.load(readFileSync(path, "utf8")) as Schema;
  if (!raw?.kind || !raw.fields) {
    throw new Error(`Invalid schema file: ${path}`);
  }
  return raw;
}

export function loadEnvelopeSchema(schemasDir = findSchemasDir()): Schema {
  return parseSchemaFile(join(schemasDir, "envelope.yaml"));
}

export function loadKindSchema(kind: string, schemasDir = findSchemasDir()): Schema {
  const path = join(schemasDir, "kinds", `${kind}.yaml`);
  if (!existsSync(path)) {
    throw new Error(`Unknown kind: ${kind}`);
  }
  return parseSchemaFile(path);
}

export function loadAllKindSchemas(schemasDir = findSchemasDir()): Schema[] {
  const kindsDir = join(schemasDir, "kinds");
  return readdirSync(kindsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => parseSchemaFile(join(kindsDir, f)));
}

export function kindTableName(kind: string): string {
  return kind.replace(/-/g, "_");
}

export function firstRequiredField(schema: Schema): string | undefined {
  for (const [name, def] of Object.entries(schema.fields)) {
    if (def.required) {
      return name;
    }
  }
  return undefined;
}

function validateFieldValue(
  fieldName: string,
  def: FieldDef,
  value: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (value === null || value === undefined) {
    if (def.required) {
      errors.push({ field: fieldName, message: "required field missing" });
    }
    return errors;
  }

  switch (def.type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ field: fieldName, message: "expected string" });
      } else if (def.max !== undefined && value.length > def.max) {
        errors.push({ field: fieldName, message: `max length ${def.max} exceeded` });
      }
      break;
    case "integer":
      if (typeof value !== "number" || !Number.isInteger(value)) {
        errors.push({ field: fieldName, message: "expected integer" });
      }
      break;
    case "float":
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors.push({ field: fieldName, message: "expected number" });
      }
      break;
    case "datetime":
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        errors.push({ field: fieldName, message: "expected ISO datetime string" });
      }
      break;
    case "enum":
      if (typeof value !== "string" || !def.values?.includes(value)) {
        errors.push({
          field: fieldName,
          message: `expected one of: ${def.values?.join(", ") ?? ""}`,
        });
      }
      break;
    case "array":
      if (!Array.isArray(value)) {
        errors.push({ field: fieldName, message: "expected array" });
      } else if (def.items === "string") {
        for (const item of value) {
          if (typeof item !== "string") {
            errors.push({ field: fieldName, message: "array items must be strings" });
            break;
          }
        }
      }
      break;
  }

  return errors;
}

export function validateAgainstSchema(
  schema: Schema,
  data: Record<string, unknown>,
  options: { allowUnknown?: boolean } = {}
): ValidationError[] {
  const errors: ValidationError[] = [];
  const allowed = new Set(Object.keys(schema.fields));

  if (!options.allowUnknown) {
    for (const key of Object.keys(data)) {
      if (!allowed.has(key)) {
        errors.push({ field: key, message: "unknown field" });
      }
    }
  }

  for (const [name, def] of Object.entries(schema.fields)) {
    errors.push(...validateFieldValue(name, def, data[name]));
  }

  return errors;
}

export function mergeValidatedFields(
  schema: Schema,
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(schema.fields)) {
    if (key in data && data[key] !== undefined) {
      result[key] = data[key];
    }
  }
  return result;
}

export function sqlTypeForField(def: FieldDef): string {
  switch (def.type) {
    case "integer":
      return "INTEGER";
    case "float":
      return "REAL";
    case "array":
      return "TEXT";
    default:
      return "TEXT";
  }
}
