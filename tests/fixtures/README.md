# Test Fixtures

This directory contains parser fixtures, captured MCP tool definitions, and a
small executable modern-protocol stdio server used by automated tests.

## Fixture types

- `single-tool.json`, `tool-array.json`, `bare-array.json`, and `manifest.yaml`
  exercise supported file shapes.
- `official-*.json` and `thirdparty-*.json` are historical captures of tool
  definitions returned by real servers. They are regression inputs, not current
  certifications of those packages.
- `modern-mcp-server.mjs` is an executable `2026-07-28` stateless stdio fixture.

Captured JSON reports may contain metadata and findings from the validator
revision that created them. Current tests intentionally revalidate or inspect
the fixture data; do not treat old counts as the current 57-rule result.

## Capturing a live server

For initialization-based servers, select legacy discovery independently from
the finalized validation target:

```bash
npm run build
node ./dist/cli.js \
  --server "npx -y @modelcontextprotocol/server-<name> [args]" \
  --discovery-spec-version 2025-11-25 \
  --spec-version 2026-07-28 \
  --profile compliance \
  --format json
```

For a finalized stateless server, omit `--discovery-spec-version` or set it to
`2026-07-28`.

Current JSON results include:

- `valid` for the effective profile threshold;
- `compliant` for effective MCP specification errors;
- issue counts by category, severity, and provenance;
- per-tool findings tagged `specification`, `governance`, or `heuristic`;
- validation profile and MCP revision metadata;
- live endpoint/command, discovery revision, authentication scope, and
  `toolExecutionPerformed: false` for live discovery runs.

The validator only calls `tools/list`; it does not execute server tools.
