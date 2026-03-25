#!/usr/bin/env bun
/**
 * Pre-build script for ElectroBun: builds the React frontend into dist/
 */
import plugin from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

const outdir = path.join(process.cwd(), "dist");

if (existsSync(outdir)) {
  await rm(outdir, { recursive: true, force: true });
}

const entrypoints = [...new Bun.Glob("**.html").scanSync("src")]
  .map((a) => path.resolve("src", a))
  .filter((dir) => !dir.includes("node_modules"));

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [plugin],
  minify: true,
  target: "browser",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

if (!result.success) {
  console.error("Frontend build failed:", result.logs);
  process.exit(1);
}

console.log(`Frontend built: ${result.outputs.length} files`);
