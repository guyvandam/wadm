import { serve } from "bun";
import path from "path";
import { unlink, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import index from "./index.html";
import type { Wadm, WadmSummary } from "./types";

const DATA_DIR = path.join(
  homedir(),
  "Library/Mobile Documents/com~apple~CloudDocs/wadm/storage"
);

// Ensure storage directory exists
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

  // If the id changed (name or date changed), delete the old file
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
      // Skip corrupted or unreadable files
    }
  }
  summaries.sort((a, b) => b.date.localeCompare(a.date));
  return summaries;
}

const server = serve({
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
        // Generate id from date + name
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

    // Serve index.html for all unmatched routes (SPA)
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
