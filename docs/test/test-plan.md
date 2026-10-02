# Validator Test Strategy

**Updated:** 2026-10-02

## Current quality gate

- 73 Vitest files
- 1,086 tests
- Coverage thresholds enforced by `npm run test:coverage`: 90% statements,
  85% branches, 90% functions, 90% lines
- ESLint and Prettier checks
- Source and test TypeScript type checking
- ESM and declaration builds through tsup
- CLI, library, HTTP service, file parsing, live HTTP, SSE, pagination, and stdio
  coverage

Run the complete local gate (lint, format check, typecheck, build, and tests
with coverage) with:

```bash
npm run check
```

CI runs on Node.js 22 and 24 (`.nvmrc` pins 24; `engines` requires
`>=22.18.0`): lint, format check, typecheck, build and tests with coverage,
`npm run validate:examples`, and `npm audit --omit=dev --audit-level=high`. A
separate `Links` job runs the lychee link check and verifies links to this
repository's own files. CodeQL code scanning uses GitHub's default setup
(repository setting), not a workflow in this repository.

## Coverage layers

1. **Rule units** — all 57 rules, malformed schemas, recursion/resource bounds,
   severity overrides, version gates, provenance, and profile behavior.
   Configuration tests reject unknown rule IDs and invalid rule settings.
2. **Parsers** — JSON/YAML input shapes, optional descriptions, modern
   stateless HTTP/stdio discovery, legacy SDK discovery, JSON/SSE responses,
   pagination, strict JSON-RPC envelopes and response IDs, completed-result
   cache hints, cache-scope consistency, structured protocol errors, and
   timeouts. Negative tests cover the 100-page pagination cap, the 10 MiB
   response-body cap, refused HTTP redirects, and stdio servers not receiving
   the caller's environment.
3. **Core integration** — configuration precedence, independent discovery and
   validation revisions, maturity aggregation, LLM failure isolation, and
   reproducibility metadata.
4. **Reporters** — human, JSON, and SARIF output including provenance and
   separate compliance/governance status, and terminal sanitization (control
   characters and escape sequences in tool names or messages are not emitted).
5. **Entry points** — CLI exit codes/options and Hono `/health` and `/validate`
   behavior, including request hardening (non-JSON content type, oversized
   bodies, malformed JSON, too many or non-object tools, request `llm` config,
   and generic 500 responses).

## Live-server evidence

The reproducible [Google Drive case study](../case-studies/google-drive.md)
exercises a managed remote MCP endpoint without authorization or tool execution.
It verifies legacy discovery with `2026-07-28` rule targeting and the
compliance profile.

Historical official and third-party captures remain under `tests/fixtures/` and
`reports/` as regression evidence. Their embedded counts reflect the validator
revision that generated them and are explicitly not current certifications.

## Release checklist

1. Run `npm run check`.
2. Run `npm run validate:examples`.
3. Verify `mcp-validate --help` matches README and specification options.
4. Validate internal Markdown links and HTML structure.
5. When protocol behavior changes, rerun the Google Drive workflow and update
   its dated result rather than overwriting prior evidence.
