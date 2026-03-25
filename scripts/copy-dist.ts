#!/usr/bin/env bun
/**
 * postWrap script: copies the built frontend (dist/) into the .app bundle's Resources
 */
import { join } from "path";
import { cpSync, existsSync, readdirSync, statSync } from "fs";

const projectRoot = process.cwd();
const distDir = join(projectRoot, "dist");
const buildDir = join(projectRoot, "build");

if (!existsSync(distDir)) {
  console.error("dist/ directory not found — run build-frontend.ts first");
  process.exit(1);
}

// Find the .app bundle(s) in build/
for (const platform of readdirSync(buildDir)) {
  const platformDir = join(buildDir, platform);
  if (!statSync(platformDir).isDirectory()) continue;
  for (const entry of readdirSync(platformDir)) {
    if (entry.endsWith(".app")) {
      const destDir = join(platformDir, entry, "Contents", "Resources", "app", "dist");
      cpSync(distDir, destDir, { recursive: true });
      console.log(`Copied dist/ -> ${destDir}`);
    }
  }
}
