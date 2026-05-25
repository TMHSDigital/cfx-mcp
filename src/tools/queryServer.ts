import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isValidHost, errorResponse } from "../utils/cfx-api.js";

const FETCH_TIMEOUT_MS = 5_000;

const inputSchema = {
  host: z
    .string()
    .min(1)
    .describe(
      "Server IP address or hostname (e.g. 127.0.0.1 or play.example.com). Do not include a port or URL scheme here.",
    ),
  port: z.number().int().min(1).max(65535).default(30120),
};

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "cfx-mcp/0.1.0" },
    });
  } finally {
    clearTimeout(id);
  }
}

export async function queryServerHandler({
  host,
  port,
}: {
  host: string;
  port: number;
}): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}> {
  if (!isValidHost(host)) {
    return errorResponse(
      new Error(
        `Invalid host "${host}". Supply a plain IP or hostname without a URL scheme or path.`,
      ),
    );
  }

  const baseUrl = `http://${host}:${port}`;

  const [infoSettled, playersSettled] = await Promise.allSettled([
    fetchWithTimeout(`${baseUrl}/info.json`),
    fetchWithTimeout(`${baseUrl}/players.json`),
  ]);

  if (infoSettled.status === "rejected") {
    return errorResponse(
      new Error(
        `Could not reach server at ${host}:${port}. The server may be offline, unreachable, or the port may be firewalled.`,
      ),
    );
  }

  const infoRes = infoSettled.value;
  if (!infoRes.ok) {
    return errorResponse(
      new Error(
        `Server at ${host}:${port} returned HTTP ${infoRes.status} on /info.json.`,
      ),
    );
  }

  const info = (await infoRes.json()) as Record<string, unknown>;

  let players: unknown[] = [];
  if (playersSettled.status === "fulfilled" && playersSettled.value.ok) {
    players = (await playersSettled.value.json()) as unknown[];
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            name: info.serverName ?? info.name,
            description: info.description,
            mapname: info.mapname,
            gametype: info.gametype,
            server_version: info.server,
            player_count: Array.isArray(players) ? players.length : 0,
            players,
            resources: info.resources,
            vars: info.vars,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function register(server: McpServer): void {
  server.tool(
    "cfx_queryServer",
    "Inspect a live FiveM server's public endpoints. Returns server name, description, player list, resources, and build info from the server's public /info.json and /players.json. No API key required. Times out after 5 seconds per endpoint.",
    inputSchema,
    async (args) => {
      try {
        return await queryServerHandler(args);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
