import type { Wadm, WadmSummary } from "./types";

export async function fetchWadms(): Promise<WadmSummary[]> {
  const res = await fetch("/api/wadms");
  return res.json();
}

export async function fetchWadm(id: string): Promise<Wadm> {
  const res = await fetch(`/api/wadms/${id}`);
  if (!res.ok) throw new Error("WADM not found");
  return res.json();
}

export async function createWadm(wadm: Partial<Wadm>): Promise<Wadm> {
  const res = await fetch("/api/wadms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wadm),
  });
  return res.json();
}

export async function updateWadm(wadm: Wadm): Promise<Wadm> {
  const res = await fetch(`/api/wadms/${wadm.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wadm),
  });
  return res.json();
}

export async function deleteWadm(id: string): Promise<void> {
  await fetch(`/api/wadms/${id}`, { method: "DELETE" });
}
