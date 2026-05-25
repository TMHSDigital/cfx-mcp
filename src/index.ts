#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { register as registerGetNative } from "./tools/getNative.js";
import { register as registerQueryServer } from "./tools/queryServer.js";
import { register as registerSearchReleases } from "./tools/searchReleases.js";

const server = new McpServer({
  name: "cfx-mcp",
  version: "0.1.0",
});

registerGetNative(server);
registerQueryServer(server);
registerSearchReleases(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Fatal error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
