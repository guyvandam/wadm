import { BrowserWindow, ApplicationMenu } from "electrobun/bun";
import { serve } from "bun";
import path from "path";
import { unlink, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import type { Wadm, WadmSummary } from "../types";

// --- Data layer (unchanged from original src/index.ts) ---

const DATA_DIR = path.join(
  homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs/wadm/storage"
);

await mkdir(DATA_DIR, { recursive: true });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wadmFileName(wadm: Wadm): string {
  const slug = slugify(wadm.name) || "untitled";
  return `${wadm.date}-${slug}`;
}

async function loadWadm(id: string): Promise<Wadm | null> {
  const file = Bun.file(path.join(DATA_DIR, `${id}.json`));
  if (!(await file.exists())) return null;
  return file.json();
}

async function saveWadm(wadm: Wadm, oldId?: string): Promise<void> {
  const newId = wadmFileName(wadm);
  wadm.id = newId;

  if (oldId && oldId !== newId) {
    const oldFile = path.join(DATA_DIR, `${oldId}.json`);
    if (await Bun.file(oldFile).exists()) {
      await unlink(oldFile);
    }
  }

  await Bun.write(
    path.join(DATA_DIR, `${newId}.json`),
    JSON.stringify(wadm, null, 2)
  );
}

async function deleteWadmFile(id: string): Promise<boolean> {
  const file = Bun.file(path.join(DATA_DIR, `${id}.json`));
  if (!(await file.exists())) return false;
  await unlink(path.join(DATA_DIR, `${id}.json`));
  return true;
}

async function listWadms(): Promise<WadmSummary[]> {
  const glob = new Bun.Glob("*.json");
  const summaries: WadmSummary[] = [];
  for await (const file of glob.scan(DATA_DIR)) {
    try {
      const wadm: Wadm = await Bun.file(path.join(DATA_DIR, file)).json();
      summaries.push({
        id: wadm.id,
        name: wadm.name,
        date: wadm.date,
        optionCount: wadm.options.length,
        criteriaCount: wadm.criteria.length,
      });
    } catch {
      // Skip corrupted files
    }
  }
  summaries.sort((a, b) => b.date.localeCompare(a.date));
  return summaries;
}

// --- Local HTTP server serving API + static frontend ---

// In the app bundle, CWD is Contents/MacOS/ and dist is at Contents/Resources/app/dist/
const DIST_DIR = path.resolve("../Resources/app/dist");

const server = serve({
  port: 0,
  routes: {
    "/api/wadms": {
      async GET() {
        const wadms = await listWadms();
        return Response.json(wadms);
      },
      async POST(req) {
        const wadm: Wadm = await req.json();
        if (!wadm.date) {
          wadm.date = new Date().toISOString().split("T")[0]!;
        }
        wadm.id = wadmFileName(wadm);
        await saveWadm(wadm);
        return Response.json(wadm, { status: 201 });
      },
    },

    "/api/wadms/:id": {
      async GET(req) {
        const wadm = await loadWadm(req.params.id);
        if (!wadm) return new Response("Not found", { status: 404 });
        return Response.json(wadm);
      },
      async PUT(req) {
        const oldId = req.params.id;
        const wadm: Wadm = await req.json();
        await saveWadm(wadm, oldId);
        return Response.json(wadm);
      },
      async DELETE(req) {
        const deleted = await deleteWadmFile(req.params.id);
        if (!deleted) return new Response("Not found", { status: 404 });
        return new Response(null, { status: 204 });
      },
    },
  },

  async fetch(req) {
    // Serve static files from dist for any non-API route
    const url = new URL(req.url);
    let filePath = path.join(DIST_DIR, url.pathname);

    // Try the exact file first
    let file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback: serve index.html for all unmatched routes
    file = Bun.file(path.join(DIST_DIR, "index.html"));
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Server running at ${server.url}`);

// --- ElectroBun window ---

ApplicationMenu.setApplicationMenu([
  {
    submenu: [
      { label: "About WADM", role: "about" },
      { type: "separator" },
      { label: "Hide WADM", role: "hide" },
      { label: "Hide Others", role: "hideOthers" },
      { label: "Show All", role: "showAll" },
      { type: "separator" },
      { label: "Quit WADM", role: "quit", accelerator: "CommandOrControl+Q" },
    ],
  },
  {
    label: "Edit",
    submenu: [
      { role: "undo", accelerator: "CommandOrControl+Z" },
      { role: "redo", accelerator: "CommandOrControl+Shift+Z" },
      { type: "separator" },
      { role: "cut", accelerator: "CommandOrControl+X" },
      { role: "copy", accelerator: "CommandOrControl+C" },
      { role: "paste", accelerator: "CommandOrControl+V" },
      { role: "selectAll", accelerator: "CommandOrControl+A" },
    ],
  },
  {
    label: "Window",
    submenu: [
      { role: "minimize", accelerator: "CommandOrControl+M" },
      { role: "zoom" },
      { role: "close", accelerator: "CommandOrControl+W" },
    ],
  },
]);

const win = new BrowserWindow({
  title: "WADM - Weighted Average Decision Matrix",
  url: server.url.toString(),
  titleBarStyle: "hiddenInset",
  frame: {
    width: 1200,
    height: 800,
    x: 100,
    y: 100,
  },
});
