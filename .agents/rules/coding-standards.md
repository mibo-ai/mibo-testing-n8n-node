# Coding Standards

## Global

1. **Language:** All code, comments, and commit messages in English.
2. **Conciseness:** Code must be self-documenting. Comments only for _why_, not _what_.
3. **Strict Typing:** `any` is prohibited. Use proper interfaces and n8n types.
4. **Simplicity:** Prefer simple solutions. If a one-liner works, don't write a method.

## TypeScript

- **Package Manager:** pnpm only.
- **Linter:** Biome. Run `pnpm run check:fix` after changes.
- **Style:** Single quotes, trailing commas, semicolons, 2-space indent.
- **Error Handling:** Use `NodeOperationError` with descriptive messages and `description` field.
- **Pure Functions:** Builders and utils must not mutate inputs or have side effects.

## Testing

- **Framework:** Vitest.
- **Mocking:** Module-level mocks with `vi.mock()`. Parametrizable mock factories.
- **Run:** `pnpm test` to run all tests.

## API Contracts

- The node communicates with a single API endpoint (`POST /public/traces`).
- Authentication via `x-api-key` header.
- Payloads above 5MB are gzip-compressed with `Content-Encoding: gzip`.
