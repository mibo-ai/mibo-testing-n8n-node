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

## Coding Standards

- **Language:** English only (code, comments, commits)
- **Package Manager:** pnpm only
- **Linter/Formatter:** Biome (single quotes, trailing commas, semicolons, 2-space indent, 100 char line width, sort importing)
- **TypeScript:** Strict mode, ES2022 target, CommonJS modules (n8n requirement)
- **No `any`:** Use proper types. n8n types: `IDataObject`, `INodeExecutionData`, `IExecuteFunctions`
- **Error handling:** Always use `NodeOperationError` with descriptive `description` field
- **Pure functions:** Builders and utils are pure — no side effects, no input mutation
- **File naming:** PascalCase for classes (`MiboTesting.node.ts`), camelCase for utilities

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

## Testing

- **Framework:** Vitest
- **Pattern:** Mock `sendTrace` at module level, create parametrizable `IExecuteFunctions` mocks
- **Coverage areas:** Node execution (manual + auto-detect modes), payload builders, HTTP client, utilities
- **Mock factory:** `createMockExecuteFunctions(overrides)` — allows per-test parameter overrides

## Sensitive Files

- **NEVER read `.env` files** — they may contain API keys and secrets. Only read `.env.example`.

## AI Assistant Guidelines

- Prefer simple solutions. Don't over-abstract.
- Fix type errors at the source, never bypass with ignores.
- Ask confirmation before major refactors (deleting files, changing architecture).
- Keep the passthrough design — never modify workflow data, only append `_miboTrace`.
- Always before finishing a plan insert in CHANGELOG.md whats new in the current or new version.
