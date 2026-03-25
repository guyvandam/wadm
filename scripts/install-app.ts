#!/usr/bin/env bun
/**
 * Copies the built .app bundle to /Applications/
 */
import { cpSync, readdirSync, statSync } from "fs";
import { join } from "path";

const buildDir = join(process.cwd(), "build");

for (const platform of readdirSync(buildDir)) {
  // Skip dev builds
  if (platform.includes("dev")) continue;

  const platformDir = join(buildDir, platform);
  if (!statSync(platformDir).isDirectory()) continue;
  for (const entry of readdirSync(platformDir)) {
    if (entry.endsWith(".app")) {
      const src = join(platformDir, entry);
      const dest = join("/Applications", entry);
      console.log(`Installing ${entry} -> ${dest}`);
      cpSync(src, dest, { recursive: true });
      console.log("Installed successfully!");
    }
  }
}
