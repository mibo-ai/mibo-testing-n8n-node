# n8n-nodes-mibo-testing - Project Context

## Overview

n8n community node that captures workflow execution traces and sends them to a testing platform API. Passthrough design — captures data transparently without modifying workflow execution.

## Project Structure

```
nodes/MiboTesting/
├── MiboTesting.node.ts       # Main node (INodeType)
├── builders.ts               # Trace payload construction
├── constants.ts              # Config constants & error codes
├── mibo-client.ts            # HTTP client for API
├── types.ts                  # TypeScript interfaces
├── utils.ts                  # Helpers (UUID, URL, header parsing)
└── mibo-testing.svg          # Node icon

credentials/
└── MiboTestingApi.credentials.ts

tests/
├── node.test.ts              # Main execution tests
├── builders.test.ts          # Payload builder tests
├── mibo-client.test.ts       # HTTP client tests
└── utils.test.ts             # Utility tests

scripts/
├── dev.mjs                   # Local dev (watch + restart n8n)
├── dev-docker.mjs            # Docker dev (watch + restart container)
└── copy-icons.mjs            # Copy icons to dist/
```

## Key Concepts

- **Two modes**: Auto-detect (discovers nodes via n8n API or "Get Workflow" node) vs Manual (user specifies node names)
- **Two payload formats**: Standard (`buildTracePayload`) for manual, Optimized (`buildOptimizedTracePayload`) for auto-detect
- **Passthrough**: Node adds `_miboTrace` metadata to output without modifying original data
- **Compression**: Gzip for payloads >5MB (`GZIP_THRESHOLD_BYTES`)
- **Request ID correlation**: Auto-detects `x-request-id` from webhook headers for active testing
- **Node filtering**: Preset filters (all, ai-only, http-only, exclude-utility, custom)

## Rules

See @AGENTS.md for coding standards, testing patterns, interaction protocol, and sensitive files.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Compile TS + copy icons to `dist/` |
| `pnpm run dev` | Local dev with watch + n8n restart |
| `pnpm run dev:docker` | Docker dev with watch + container restart |
| `pnpm test` | Run tests (vitest) |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm run check` | Biome lint + format check |
| `pnpm run check:fix` | Auto-fix lint/format |
