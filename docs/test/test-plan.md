# Validator Test Strategy

**Updated:** 2026-08-09

## Current quality gate

- 71 Vitest files
- 1,036 tests
- Source and test TypeScript type checking
- ESM and declaration builds through tsup
- CLI, library, HTTP service, file parsing, live HTTP, SSE, pagination, and stdio
  coverage

Run the complete gate with:

```bash
npm test
npm run typecheck
```

## Coverage layers

1. **Rule units** — all 57 rules, malformed schemas, recursion/resource bounds,
   severity overrides, version gates, provenance, and profile behavior.
2. **Parsers** — JSON/YAML input shapes, optional descriptions, modern
   stateless HTTP/stdio discovery, legacy SDK discovery, JSON/SSE responses,
   pagination, strict JSON-RPC envelopes and response IDs, completed-result
   cache hints, cache-scope consistency, structured protocol errors, and
   timeouts.
3. **Core integration** — configuration precedence, independent discovery and
   validation revisions, maturity aggregation, LLM failure isolation, and
   reproducibility metadata.
4. **Reporters** — human, JSON, and SARIF output including provenance and
   separate compliance/governance status.
5. **Entry points** — CLI exit codes/options and Hono `/health` and `/validate`
   behavior.

## Live-server evidence

The reproducible [Google Drive case study](../case-studies/google-drive.md)
exercises a managed remote MCP endpoint without authorization or tool execution.
It verifies legacy discovery with finalized `2026-07-28` rule targeting and the
compliance profile.

Historical official and third-party captures remain under `tests/fixtures/` and
`reports/` as regression evidence. Their embedded counts reflect the validator
revision that generated them and are explicitly not current certifications.

## Release checklist

1. Run `npm test` and `npm run typecheck`.
2. Run `npm run validate:examples`.
3. Verify `mcp-validate --help` matches README and specification options.
4. Validate internal Markdown links and HTML structure.
5. When protocol behavior changes, rerun the Google Drive workflow and update
   its dated result rather than overwriting prior evidence.
