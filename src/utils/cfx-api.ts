import { z } from "zod";

const NATIVES_URL = "https://runtime.fivem.net/doc/natives.json";
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data as T;
  return undefined;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearCache(): void {
  cache.clear();
}

export const NativeParamSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
});

export const NativeEntrySchema = z.object({
  name: z.string().optional(),
  apiset: z.string().optional(),
  hash: z.string().optional(),
  jhash: z.string().optional(),
  params: z.array(NativeParamSchema).optional(),
  return_type: z.string().optional(),
  description: z.string().optional(),
  results: z.string().optional(),
  examples: z
    .array(z.object({ lang: z.string(), code: z.string() }))
    .optional(),
});

export type NativeEntry = z.infer<typeof NativeEntrySchema>;
export type NativesDb = Record<string, Record<string, NativeEntry>>;

export async function fetchNativesDb(): Promise<NativesDb> {
  const hit = getCached<NativesDb>("natives");
  if (hit !== undefined) return hit;

  const res = await fetch(NATIVES_URL, {
    headers: { "User-Agent": "cfx-mcp/0.1.0" },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch native database: HTTP ${res.status} from ${NATIVES_URL}`,
    );
  }
  const data = (await res.json()) as NativesDb;
  setCached("natives", data);
  return data;
}

export function lookupNative(
  db: NativesDb,
  query: string,
): NativeEntry | NativeEntry[] | null {
  const q = query.trim();
  const isHash = /^0x[0-9A-Fa-f]{8,16}$/.test(q);

  if (isHash) {
    const upper = "0x" + q.slice(2).toUpperCase();
    for (const ns of Object.values(db)) {
      const entry = ns[upper];
      if (entry) return { ...entry, hash: upper };
    }
    return null;
  }

  const qUpper = q.toUpperCase();

  // Exact name match first
  for (const ns of Object.values(db)) {
    for (const [hash, entry] of Object.entries(ns)) {
      if (entry.name?.toUpperCase() === qUpper) return { ...entry, hash };
    }
  }

  // Partial name search - cap at 20 results
  const matches: NativeEntry[] = [];
  for (const ns of Object.values(db)) {
    for (const [hash, entry] of Object.entries(ns)) {
      if (entry.name?.toUpperCase().includes(qUpper)) {
        matches.push({ ...entry, hash });
        if (matches.length >= 20) return matches;
      }
    }
  }
  return matches.length > 0 ? matches : null;
}

// Only allow plain IP or hostname - no URL schemes, paths, or ports in the host field.
export function isValidHost(host: string): boolean {
  const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const HOSTNAME = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*$/;
  const IPV6 = /^\[([0-9a-fA-F:]+)\]$/;
  return IPV4.test(host) || HOSTNAME.test(host) || IPV6.test(host);
}

export function errorResponse(error: unknown): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  const message =
    error instanceof Error ? error.message : "An unknown error occurred.";
  return { content: [{ type: "text", text: message }], isError: true };
}
