<!-- standards-version: 1.10.0 -->

# Roadmap

**Current:** v0.1.0

## CFX MCP

### v0.1.0 -- Read Core (shipped)

- [x] `cfx_getNative` - native lookup from runtime.fivem.net/doc/natives.json
- [x] `cfx_queryServer` - live FiveM server inspector via public endpoints
- [x] `cfx_searchReleases` - cfx.re releases search via Discourse API
- [x] TypeScript + MCP SDK 1.12.1 + Zod
- [x] Vitest test suite wired into CI

### v0.2.0 -- Extended Read Surface

- [ ] `cfx_searchNatives` - full-text search across native descriptions
- [ ] `cfx_listNamespace` - return all natives in a given namespace (ENTITY, VEHICLE, etc.)
- [ ] `cfx_getDocsPage` - fetch a docs.fivem.net page for reference

### v1.0.0 -- Write Surface

- [ ] `cfx_scaffoldResource` - generate fxmanifest.lua and starter script skeleton
- [ ] `cfx_validateManifest` - parse and report errors in a local fxmanifest.lua
- [ ] `cfx_buildTxAdminRecipe` - generate a txAdmin server recipe YAML
- [ ] npm publish + marketplace listing
