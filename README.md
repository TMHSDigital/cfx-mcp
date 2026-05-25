# CFX MCP

**Read-only MCP server for CFX/FiveM development. Three tools, no API key required.**

![License: CC-BY-NC-ND-4.0](https://img.shields.io/badge/license-CC--BY--NC--ND--4.0-green)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

---

## Tools

### cfx_getNative

Look up a FiveM or RedM native function by exact name, partial name, or hex hash. The full native database (~5 MB) is fetched once from `runtime.fivem.net` and cached in memory for the session.

**Args**
- `query` (string, required) - native name (`GET_ENTITY_COORDS`), partial name (`ENTITY_COORDS`), or hex hash (`0x3FEF770D40960D5A`). Partial matches return up to 20 results.

**Example**
```json
{ "query": "GET_ENTITY_COORDS" }
```

---

### cfx_queryServer

Inspect a live FiveM server's public HTTP endpoints. Fetches `/info.json` and `/players.json` from the server. Times out after 5 seconds per endpoint.

**Args**
- `host` (string, required) - server IP or hostname (`127.0.0.1`, `play.example.com`). No URL scheme or port here.
- `port` (number, optional, default `30120`) - server port.

**Example**
```json
{ "host": "play.example.com", "port": 30120 }
```

---

### cfx_searchReleases

Search the cfx.re community releases forum via the public Discourse search API.

**Args**
- `query` (string, required) - search terms (`vehicle spawn menu`, `esx banking`, `vrp framework`).
- `limit` (number, optional, default `10`, max `20`) - number of results.

**Example**
```json
{ "query": "esx framework", "limit": 5 }
```

---

## Running as an MCP server

```bash
npm install -g @tmhsdigital/cfx-mcp
cfx-mcp
```

Or run from source:

```bash
npm ci
npm run build
node dist/index.js
```

Add to your MCP client config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "cfx-mcp": {
      "command": "cfx-mcp"
    }
  }
}
```

## Notes

- All three tools are read-only. No credentials or API keys are required.
- `cfx_queryServer` validates the `host` parameter to prevent arbitrary URL access. Supply a plain IP or hostname only.
- The native database is cached per process. Restart the server to force a refresh.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

CC-BY-NC-ND-4.0 -- see [LICENSE](LICENSE) for details.

---

**Built by TMHSDigital**
