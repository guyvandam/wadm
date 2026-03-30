/**
 * Auto-detects whether to use the server API or localStorage API.
 * On Vercel (static deploy), there's no /api server, so we fall back to localStorage.
 */
import * as serverApi from "./api";
import * as localApi from "./api-local";

let _isDemo: boolean | null = null;

async function isDemo(): Promise<boolean> {
  if (_isDemo !== null) return _isDemo;
  try {
    const res = await fetch("/api/password", { method: "GET" });
    const contentType = res.headers.get("content-type") || "";
    // If the response is HTML (SPA fallback) or 404, there's no real API server
    _isDemo = !res.ok || !contentType.includes("application/json");
  } catch {
    _isDemo = true;
  }
  return _isDemo;
}

export async function fetchWadms() {
  return (await isDemo()) ? localApi.fetchWadms() : serverApi.fetchWadms();
}

export async function fetchWadm(id: string) {
  return (await isDemo()) ? localApi.fetchWadm(id) : serverApi.fetchWadm(id);
}

export async function createWadm(wadm: Parameters<typeof serverApi.createWadm>[0]) {
  return (await isDemo()) ? localApi.createWadm(wadm) : serverApi.createWadm(wadm);
}

export async function updateWadm(wadm: Parameters<typeof serverApi.updateWadm>[0]) {
  return (await isDemo()) ? localApi.updateWadm(wadm) : serverApi.updateWadm(wadm);
}

export async function deleteWadm(id: string) {
  return (await isDemo()) ? localApi.deleteWadm(id) : serverApi.deleteWadm(id);
}

export function isDemoMode() {
  return _isDemo === true;
}

export async function detectMode(): Promise<boolean> {
  return isDemo();
}
