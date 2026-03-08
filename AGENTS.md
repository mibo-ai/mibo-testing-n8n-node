# n8n-nodes-mibo-testing - Agent Rules

## Coding Standards

### Global

1. **Language:** All code, comments, and commit messages in English.
2. **Conciseness:** Code must be self-documenting. Comments only for _why_, not _what_.
3. **Strict Typing:** `any` is prohibited. Use proper interfaces and n8n types.
4. **Simplicity:** Prefer simple solutions. If a one-liner works, don't write a method.

### TypeScript

- **Package Manager:** pnpm only.
- **Linter/Formatter:** Biome (single quotes, trailing commas, semicolons, 2-space indent, 100 char line width, sort imports). Run `pnpm run check:fix` after changes.
- **TypeScript:** Strict mode, ES2022 target, CommonJS modules (n8n requirement).
- **Error Handling:** Use `NodeOperationError` with descriptive messages and `description` field.
- **Pure Functions:** Builders and utils must not mutate inputs or have side effects.
- **File naming:** PascalCase for classes (`MiboTesting.node.ts`), camelCase for utilities.
- **n8n types:** `IDataObject`, `INodeExecutionData`, `IExecuteFunctions`, `INodeType`.

### Testing

- **Framework:** Vitest.
- **Mocking:** Module-level mocks with `vi.mock()`. Parametrizable mock factories.
- **Mock factory:** `createMockExecuteFunctions(overrides)` — allows per-test parameter overrides.
- **Run:** `pnpm test` to run all tests.

### API Contracts

- The node communicates with a single API endpoint (`POST /public/traces`).
- Authentication via `x-api-key` header.
- Payloads above 5MB are gzip-compressed with `Content-Encoding: gzip`.

## Interaction Protocol

- Prefer simple solutions. Don't over-abstract.
- Fix type errors at the source, never bypass with ignores.
- Ask confirmation before major refactors (deleting files, changing architecture).
- Keep the passthrough design — never modify workflow data, only append `_miboTrace`.
- Always before finishing a plan, insert in CHANGELOG.md what's new in the current or new version.

## Sensitive Files

- **NEVER read `.env` files** — they may contain API keys and secrets. Only read `.env.example`.
