import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function copySqlWasm() {
  const src = resolve(__dirname, "node_modules/sql.js/dist/sql-wasm.wasm");
  const destDir = resolve(__dirname, "dist");
  const dest = resolve(destDir, "sql-wasm.wasm");

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  if (!existsSync(src)) {
    console.error("Warning: sql-wasm.wasm not found. Run 'npm install' first.");
    return;
  }

  copyFileSync(src, dest);
  console.log("Copied sql-wasm.wasm to dist/");
}

copySqlWasm();

await esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  target: "es2022",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
});
