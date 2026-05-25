import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchNativesDb,
  lookupNative,
  errorResponse,
} from "../utils/cfx-api.js";

const inputSchema = {
  query: z
    .string()
    .min(1)
    .describe(
      "Native name (GET_ENTITY_COORDS), partial name (ENTITY_COORDS), or hex hash (0x3FEF770D40960D5A). Partial matches return up to 20 results.",
    ),
};

export async function getNativeHandler({
  query,
}: {
  query: string;
}): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}> {
  try {
    const db = await fetchNativesDb();
    const result = lookupNative(db, query);

    if (result === null) {
      return errorResponse(new Error(`No native found matching "${query}".`));
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return errorResponse(error);
  }
}

export function register(server: McpServer): void {
  server.tool(
    "cfx_getNative",
    "Look up a FiveM or RedM native function by exact name, partial name, or hex hash. Returns parameters, return type, description, and examples. The native database is cached in memory for the session. No API key required.",
    inputSchema,
    async (args) => {
      try {
        return await getNativeHandler(args);
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
