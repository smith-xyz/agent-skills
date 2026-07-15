#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";
import {
  defaultDbPath,
  initDb,
  insertLink,
  insertSuggestion,
  insertValidationSuggestion,
  openDb,
  upsertArtifact,
} from "./db.ts";
import {
  findSchemasDir,
  firstRequiredField,
  loadEnvelopeSchema,
  loadKindSchema,
  mergeValidatedFields,
  validateAgainstSchema,
} from "./schema-loader.ts";
import type {
  ArtifactStatus,
  DomainConfig,
  EmitResult,
  InitDbResult,
  LinkRel,
  LinkResult,
  SuggestionResult,
  ValidateDomainsResult,
} from "./types.ts";
import { LINK_RELS } from "./types.ts";

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const command = args[0] ?? "";
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i++;
    } else {
      flags[key] = true;
    }
  }

  return { command, flags };
}

function flagString(flags: Record<string, string | boolean>, key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function resolveDbPath(flags: Record<string, string | boolean>): string {
  return resolve(flagString(flags, "db") ?? defaultDbPath());
}

function output(data: unknown): void {
  console.log(JSON.stringify(data));
}

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function cmdInitDb(flags: Record<string, string | boolean>): InitDbResult {
  const dbPath = resolveDbPath(flags);
  const schemasDir = process.env.ARTIFACT_SCHEMAS_DIR;
  const result = initDb(dbPath, schemasDir);
  output(result);
  return result;
}

function buildEnvelopeFromFlags(
  flags: Record<string, string | boolean>,
  kind: string,
  id: string
): Record<string, unknown> {
  const relatedRaw = flagString(flags, "related");
  return {
    id,
    kind,
    title: flagString(flags, "title"),
    domain: flagString(flags, "domain"),
    source: flagString(flags, "source") ?? "manual",
    url: flagString(flags, "url"),
    related: relatedRaw ? relatedRaw.split(",") : undefined,
    diagram_ref: flagString(flags, "diagram-ref"),
    node: flagString(flags, "node"),
    next: flagString(flags, "next"),
    blocked: flagString(flags, "blocked"),
    status: flagString(flags, "status"),
    last_action: flagString(flags, "last-action"),
    last_action_at: flagString(flags, "last-action-at"),
  };
}

function detectJiraKeyFromBranch(): string | undefined {
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    if (result.exitCode !== 0) return undefined;
    const branch = result.stdout.toString().trim();
    const match = branch.match(/^([A-Z][A-Z0-9]+-\d+)/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function cmdEmit(flags: Record<string, string | boolean>): EmitResult {
  const kind = flagString(flags, "kind");
  const domain = flagString(flags, "domain");
  const title = flagString(flags, "title");
  const status = flagString(flags, "status") as ArtifactStatus | undefined;

  if (!kind) fail("--kind is required");
  if (!domain) fail("--domain is required");
  if (!title) fail("--title is required");
  if (!status) fail("--status is required");

  const envelopeSchema = loadEnvelopeSchema();
  const kindSchema = loadKindSchema(kind);

  let kindData: Record<string, unknown> = {};
  const dataJson = flagString(flags, "data");
  if (dataJson) {
    try {
      kindData = JSON.parse(dataJson) as Record<string, unknown>;
    } catch {
      fail("Invalid --data JSON");
    }
  }

  let localId = flagString(flags, "id");
  if (!localId) {
    const keyField = firstRequiredField(kindSchema);
    if (!keyField || kindData[keyField] === undefined) {
      fail(`--id required or provide ${keyField ?? "required field"} in --data`);
    }
    localId = String(kindData[keyField]);
  }

  const artifactId = `${kind}/${domain}/${localId}`;
  const envelopeInput = {
    ...buildEnvelopeFromFlags(flags, kind, artifactId),
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  const envelopeErrors = validateAgainstSchema(envelopeSchema, envelopeInput);
  const kindErrors = validateAgainstSchema(kindSchema, kindData);
  const allErrors = [...envelopeErrors, ...kindErrors];

  const dbPath = resolveDbPath(flags);
  const handle = openDb(dbPath);

  if (allErrors.length > 0) {
    insertValidationSuggestion(handle, allErrors);
    handle.close();
    for (const err of allErrors) {
      console.error(`${err.field}: ${err.message}`);
    }
    process.exit(1);
  }

  const envelope = mergeValidatedFields(envelopeSchema, envelopeInput) as unknown as Parameters<
    typeof upsertArtifact
  >[1];
  const validatedKind = mergeValidatedFields(kindSchema, kindData);

  const result = upsertArtifact(handle, envelope, validatedKind);

  const jiraKey = flagString(flags, "jira") ?? (flags["auto-jira"] ? detectJiraKeyFromBranch() : undefined);
  if (jiraKey) {
    const jiraItemId = `jira-item/${domain}/${jiraKey}`;
    insertLink(handle, artifactId, jiraItemId, "tracks");
    (result as Record<string, unknown>).linked_jira = jiraKey;
  }

  handle.close();
  output(result);
  return result;
}

function cmdSuggest(flags: Record<string, string | boolean>): SuggestionResult {
  const text = flagString(flags, "text");
  if (!text) fail("--text is required");

  const handle = openDb(resolveDbPath(flags));
  const id = insertSuggestion(
    handle,
    text,
    flagString(flags, "source-skill"),
    flagString(flags, "session-id")
  );
  handle.close();
  const result = { id };
  output(result);
  return result;
}

function cmdLink(flags: Record<string, string | boolean>): LinkResult {
  const from = flagString(flags, "from");
  const to = flagString(flags, "to");
  const rel = flagString(flags, "rel") as LinkRel | undefined;

  if (!from) fail("--from is required");
  if (!to) fail("--to is required");
  if (!rel) fail("--rel is required");
  if (!LINK_RELS.includes(rel)) {
    fail(`--rel must be one of: ${LINK_RELS.join(", ")}`);
  }

  const handle = openDb(resolveDbPath(flags));
  const result = insertLink(handle, from, to, rel);
  handle.close();
  output(result);
  return result;
}

function validateDomainConfig(config: DomainConfig, file: string): string[] {
  const errors: string[] = [];
  if (!config.domain) errors.push(`${file}: missing domain`);
  if (!config.initiative) errors.push(`${file}: missing initiative`);

  if (config.topology) {
    const nodeIds = new Set<string>();
    for (const node of config.topology.nodes ?? []) {
      if (!node.id) errors.push(`${file}: topology node missing id`);
      if (!node.label) errors.push(`${file}: topology node ${node.id} missing label`);
      nodeIds.add(node.id);
    }
    for (const edge of config.topology.edges ?? []) {
      if (!nodeIds.has(edge.from)) {
        errors.push(`${file}: edge from unknown node ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`${file}: edge to unknown node ${edge.to}`);
      }
    }
  }

  for (const gate of config.gates ?? []) {
    if (!gate.name) errors.push(`${file}: gate missing name`);
    if (!gate.applies_when) errors.push(`${file}: gate missing applies_when`);
  }

  return errors;
}

function cmdValidateDomains(flags: Record<string, string | boolean>): ValidateDomainsResult {
  const dir =
    flagString(flags, "dir") ??
    join(process.cwd(), ".cursor", "schemas", "domains");

  if (!existsSync(dir)) {
    fail(`Directory not found: ${dir}`);
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  const allErrors: Array<{ file: string; message: string }> = [];
  let valid = 0;

  for (const file of files) {
    const path = join(dir, file);
    const config = yaml.load(readFileSync(path, "utf8")) as DomainConfig;
    const messages = validateDomainConfig(config, file);
    if (messages.length === 0) {
      valid++;
    } else {
      for (const message of messages) {
        allErrors.push({ file, message });
      }
    }
  }

  const result = { valid, errors: allErrors };
  output(result);
  if (allErrors.length > 0) {
    process.exit(1);
  }
  return result;
}

async function cmdPlugin(flags: Record<string, string | boolean>): Promise<void> {
  const { discoverPlugins, loadPlugin } = await import("./plugin.ts");
  const pluginName = flagString(flags, "name");

  if (!pluginName) {
    const discovered = await discoverPlugins();
    if (discovered.size === 0) {
      console.log("No plugins found.");
    } else {
      console.log("Available plugins:");
      for (const name of discovered.keys()) {
        console.log(`  ${name}`);
      }
    }
    return;
  }

  const discovered = await discoverPlugins();
  const pluginPath = discovered.get(pluginName);
  if (!pluginPath) {
    fail(`Plugin not found: ${pluginName}. Run 'artifact plugin' to list available.`);
  }

  const plugin = await loadPlugin(pluginPath);
  const dbPath = resolveDbPath(flags);
  const handle = openDb(dbPath);

  try {
    const result = await plugin.run({
      workspaceRoot: process.cwd(),
      dbPath,
      db: handle,
      args: flags,
    });
    output(result);
    if (result.errors.length > 0) process.exitCode = 1;
  } finally {
    handle.close();
  }
}

function printUsage(): void {
  console.error(`Usage: artifact <command> [options]

Commands:
  init-db [--db path]
  emit --kind <kind> --domain <domain> [--id local_id] --title "..." --status <enum> [--next "..."] [--related id1,id2] [--diagram-ref path] [--data '{...}'] [--jira KEY] [--auto-jira] [--db path]
  suggest --text "..." [--source-skill name] [--session-id id] [--db path]
  link --from <id> --to <id> --rel <feeds-into|depends-on|tracks|dupes> [--db path]
  validate-domains [--dir path]
  plugin [--name <plugin-name>] [--db path] [...plugin-specific flags]

Emit options:
  --jira KEY        Link artifact to jira-item/<domain>/KEY via 'tracks' relation
  --auto-jira       Auto-detect Jira key from branch name (e.g. HPCASE-456-foo)
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv);

  switch (command) {
    case "init-db":
      cmdInitDb(flags);
      break;
    case "emit":
      cmdEmit(flags);
      break;
    case "suggest":
      cmdSuggest(flags);
      break;
    case "link":
      cmdLink(flags);
      break;
    case "validate-domains":
      cmdValidateDomains(flags);
      break;
    case "plugin":
      await cmdPlugin(flags);
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

main();
