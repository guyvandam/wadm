/**
 * localStorage-based API for the Vercel demo.
 * Data lives only in localStorage and is cleared on refresh.
 */
import type { Wadm, WadmSummary } from "./types";

const STORAGE_KEY = "wadm-demo-data";

function getAll(): Wadm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(wadms: Wadm[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wadms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function wadmId(wadm: Partial<Wadm>): string {
  const slug = slugify(wadm.name || "") || "untitled";
  const date = wadm.date || new Date().toISOString().split("T")[0]!;
  return `${date}-${slug}`;
}

export async function fetchWadms(): Promise<WadmSummary[]> {
  return getAll()
    .map((w) => ({
      id: w.id,
      name: w.name,
      date: w.date,
      optionCount: w.options.length,
      criteriaCount: w.criteria.length,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchWadm(id: string): Promise<Wadm> {
  const wadm = getAll().find((w) => w.id === id);
  if (!wadm) throw new Error("WADM not found");
  return wadm;
}

export async function createWadm(partial: Partial<Wadm>): Promise<Wadm> {
  const wadm: Wadm = {
    id: "",
    name: partial.name || "Untitled Decision",
    date: partial.date || new Date().toISOString().split("T")[0]!,
    notes: partial.notes || "",
    criteria: partial.criteria || [],
    options: partial.options || [],
  };
  wadm.id = wadmId(wadm);
  const all = getAll();
  all.push(wadm);
  saveAll(all);
  return wadm;
}

export async function updateWadm(wadm: Wadm): Promise<Wadm> {
  const all = getAll();
  const newId = wadmId(wadm);
  const oldId = wadm.id;
  wadm.id = newId;

  const idx = all.findIndex((w) => w.id === oldId);
  if (idx >= 0) {
    all[idx] = wadm;
  } else {
    all.push(wadm);
  }
  saveAll(all);
  return wadm;
}

export async function deleteWadm(id: string): Promise<void> {
  const all = getAll().filter((w) => w.id !== id);
  saveAll(all);
}

export function importWadms(wadms: Wadm[]) {
  const all = getAll();
  for (const wadm of wadms) {
    wadm.id = wadmId(wadm);
    const idx = all.findIndex((w) => w.id === wadm.id);
    if (idx >= 0) {
      all[idx] = wadm;
    } else {
      all.push(wadm);
    }
  }
  saveAll(all);
}

export function exportWadms(): Wadm[] {
  return getAll();
}
