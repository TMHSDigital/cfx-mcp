import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResponse } from "../utils/cfx-api.js";

const DISCOURSE_SEARCH = "https://forum.cfx.re/search.json";

interface DiscourseSearchResult {
  topics?: Array<{
    id: number;
    title: string;
    slug: string;
    created_at: string;
    reply_count: number;
    tags?: string[];
    posters?: Array<{
      description: string;
      user?: { username: string };
    }>;
  }>;
}

const inputSchema = {
  query: z
    .string()
    .min(1)
    .describe(
      "Search terms for cfx.re community releases (e.g. 'vehicle spawn menu', 'esx banking', 'vrp framework').",
    ),
  limit: z.number().int().min(1).max(20).default(10),
};

export async function searchReleasesHandler({
  query,
  limit,
}: {
  query: string;
  limit: number;
}): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}> {
  const params = new URLSearchParams({
    q: `${query} category:releases`,
  });
  const url = `${DISCOURSE_SEARCH}?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "cfx-mcp/0.1.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return errorResponse(
      new Error(
        `cfx.re Discourse search API returned HTTP ${res.status}. The forum may be temporarily unavailable.`,
      ),
    );
  }

  const data = (await res.json()) as DiscourseSearchResult;

  const topics = (data.topics ?? []).slice(0, limit).map((t) => ({
    title: t.title,
    url: `https://forum.cfx.re/t/${t.slug}/${t.id}`,
    author:
      t.posters?.find((p) => p.description.includes("Original Poster"))?.user
        ?.username ?? "unknown",
    created_at: t.created_at,
    reply_count: t.reply_count,
    tags: t.tags ?? [],
  }));

  if (topics.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No releases found on cfx.re matching "${query}".`,
        },
      ],
    };
  }

  return {
    content: [{ type: "text", text: JSON.stringify(topics, null, 2) }],
  };
}

export function register(server: McpServer): void {
  server.tool(
    "cfx_searchReleases",
    "Search the cfx.re community releases forum via the Discourse search API. Returns matching topic titles, authors, dates, reply counts, and links. No API key required.",
    inputSchema,
    async (args) => {
      try {
        return await searchReleasesHandler(args);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
