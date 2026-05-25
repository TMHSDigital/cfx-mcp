# Changelog

All notable changes to CFX MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-05-24

### Added

- `cfx_getNative` - look up FiveM/RedM native functions by name, partial name, or hex hash; native DB cached in memory per session
- `cfx_queryServer` - inspect a live FiveM server via its public `/info.json` and `/players.json` endpoints; host validated to prevent path injection; 5 s timeout
- `cfx_searchReleases` - search cfx.re community releases via the public Discourse search API
- TypeScript source with MCP SDK 1.12.1, Zod validation, Node16 module resolution
- Vitest test suite covering happy-path, validation guard, and graceful-failure paths for all three tools
- CI workflow (Node 20 + 22 matrix: build and test on every PR and push to main)
