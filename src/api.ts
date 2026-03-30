import type { Wadm, WadmSummary } from "./types";

// In-memory password for the session
let _password = "";

export function setPassword(password: string) {
  _password = password;
}

export function getPassword(): string {
  return _password;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Password": _password,
    ...extra,
  };
}

export async function checkPassword(): Promise<{ hasPassword: boolean }> {
  const res = await fetch("/api/password");
  return res.json();
}

export async function submitPassword(password: string): Promise<{ ok: boolean; created?: boolean; error?: string }> {
  const res = await fetch("/api/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.json();
}

export async function fetchWadms(): Promise<WadmSummary[]> {
  const res = await fetch("/api/wadms", { headers: headers() });
  return res.json();
}

export async function fetchWadm(id: string): Promise<Wadm> {
  const res = await fetch(`/api/wadms/${id}`, { headers: headers() });
  if (!res.ok) throw new Error("WADM not found");
  return res.json();
}

export async function createWadm(wadm: Partial<Wadm>): Promise<Wadm> {
  const res = await fetch("/api/wadms", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(wadm),
  });
  return res.json();
}

export async function updateWadm(wadm: Wadm): Promise<Wadm> {
  const res = await fetch(`/api/wadms/${wadm.id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(wadm),
  });
  return res.json();
}

export async function deleteWadm(id: string): Promise<void> {
  await fetch(`/api/wadms/${id}`, { method: "DELETE", headers: headers() });
}
