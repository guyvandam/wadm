import { BrowserWindow, ApplicationMenu } from "electrobun/bun";
import { serve } from "bun";
import path from "path";
import { unlink, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import type { Wadm, WadmSummary } from "../types";

// --- Encryption helpers (AES-256-GCM with PBKDF2-derived key) ---

const SALT_LEN = 16;
const IV_LEN = 12;
const ITERATIONS = 100_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(data: string, password: string): Promise<Buffer> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(data)
  );
  // Format: salt (16) + iv (12) + ciphertext
  const result = new Uint8Array(SALT_LEN + IV_LEN + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LEN);
  result.set(new Uint8Array(encrypted), SALT_LEN + IV_LEN);
  return Buffer.from(result);
}

async function decrypt(data: Buffer, password: string): Promise<string> {
  const bytes = new Uint8Array(data);
  const salt = bytes.slice(0, SALT_LEN);
  const iv = bytes.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = bytes.slice(SALT_LEN + IV_LEN);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
}

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

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

const PASSWORD_FILE = path.join(DATA_DIR, ".password");

async function getStoredPasswordHash(): Promise<string | null> {
  const file = Bun.file(PASSWORD_FILE);
  if (!(await file.exists())) return null;
  return (await file.text()).trim();
}

async function setStoredPasswordHash(hash: string): Promise<void> {
  await Bun.write(PASSWORD_FILE, hash);
}

function getPassword(req: Request): string {
  return req.headers.get("x-password") || "";
}

async function loadWadm(id: string, password: string): Promise<Wadm | null> {
  const encFile = Bun.file(path.join(DATA_DIR, `${id}.enc`));
  if (await encFile.exists()) {
    const raw = Buffer.from(await encFile.arrayBuffer());
    const json = await decrypt(raw, password);
    return JSON.parse(json);
  }
  // Fallback: read unencrypted .json (for migration)
  const jsonFile = Bun.file(path.join(DATA_DIR, `${id}.json`));
  if (await jsonFile.exists()) return jsonFile.json();
  return null;
}

async function saveWadm(wadm: Wadm, password: string, oldId?: string): Promise<void> {
  const newId = wadmFileName(wadm);
  wadm.id = newId;

  if (oldId && oldId !== newId) {
    // Clean up old files (both .enc and .json)
    for (const ext of [".enc", ".json"]) {
      const oldFile = path.join(DATA_DIR, `${oldId}${ext}`);
      if (await Bun.file(oldFile).exists()) await unlink(oldFile);
    }
  }

  const encrypted = await encrypt(JSON.stringify(wadm), password);
  await Bun.write(path.join(DATA_DIR, `${newId}.enc`), encrypted);

  // Remove old unencrypted version if it exists
  const oldJson = path.join(DATA_DIR, `${newId}.json`);
  if (await Bun.file(oldJson).exists()) await unlink(oldJson);
}

async function deleteWadmFile(id: string): Promise<boolean> {
  let deleted = false;
  for (const ext of [".enc", ".json"]) {
    const file = Bun.file(path.join(DATA_DIR, `${id}${ext}`));
    if (await file.exists()) {
      await unlink(path.join(DATA_DIR, `${id}${ext}`));
      deleted = true;
    }
  }
  return deleted;
}

async function listWadms(password: string): Promise<WadmSummary[]> {
  const summaries: WadmSummary[] = [];

  // Read encrypted files
  const encGlob = new Bun.Glob("*.enc");
  for await (const file of encGlob.scan(DATA_DIR)) {
    try {
      const raw = Buffer.from(await Bun.file(path.join(DATA_DIR, file)).arrayBuffer());
      const json = await decrypt(raw, password);
      const wadm: Wadm = JSON.parse(json);
      summaries.push({
        id: wadm.id,
        name: wadm.name,
        date: wadm.date,
        optionCount: wadm.options.length,
        criteriaCount: wadm.criteria.length,
      });
    } catch {
      // Skip corrupted or undecryptable files
    }
  }

  // Also read unencrypted .json files (migration support)
  const jsonGlob = new Bun.Glob("*.json");
  for await (const file of jsonGlob.scan(DATA_DIR)) {
    try {
      const wadm: Wadm = await Bun.file(path.join(DATA_DIR, file)).json();
      // Skip if we already have an encrypted version
      if (summaries.some((s) => s.id === wadm.id)) continue;
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
    "/api/password": {
      // Check if a password has been set
      async GET() {
        const hash = await getStoredPasswordHash();
        return Response.json({ hasPassword: hash !== null });
      },
      // Set or verify password
      async POST(req) {
        const { password } = await req.json() as { password: string };
        if (!password) return Response.json({ error: "Password required" }, { status: 400 });

        const hash = await getStoredPasswordHash();
        if (hash === null) {
          // First time: set the password
          await setStoredPasswordHash(await hashPassword(password));
          return Response.json({ ok: true, created: true });
        }
        // Verify existing password
        const valid = await verifyPassword(password, hash);
        if (!valid) return Response.json({ error: "Invalid password" }, { status: 401 });
        return Response.json({ ok: true, created: false });
      },
    },

    "/api/wadms": {
      async GET(req) {
        const password = getPassword(req);
        const wadms = await listWadms(password);
        return Response.json(wadms);
      },
      async POST(req) {
        const password = getPassword(req);
        const wadm: Wadm = await req.json();
        if (!wadm.date) {
          wadm.date = new Date().toISOString().split("T")[0]!;
        }
        wadm.id = wadmFileName(wadm);
        await saveWadm(wadm, password);
        return Response.json(wadm, { status: 201 });
      },
    },

    "/api/wadms/:id": {
      async GET(req) {
        const password = getPassword(req);
        const wadm = await loadWadm(req.params.id, password);
        if (!wadm) return new Response("Not found", { status: 404 });
        return Response.json(wadm);
      },
      async PUT(req) {
        const password = getPassword(req);
        const oldId = req.params.id;
        const wadm: Wadm = await req.json();
        await saveWadm(wadm, password, oldId);
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
