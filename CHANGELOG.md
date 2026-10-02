# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/) (pre-1.0: minor versions may
contain breaking changes).

## Unreleased

## 0.2.0 - 2026-10-02

Hardening release. See [AUDIT.md](AUDIT.md) for the findings that motivated it.

### Breaking

- The package is renamed from `mcp-tool-validator` to
  `mcp-tool-description-validator`. The old npm name belongs to an unrelated
  package, so the previous install instructions installed third-party code.
  The CLI command is still `mcp-validate`.
- Node.js 22.18 or later is required (Node 20 is end-of-life). `.nvmrc` pins
  Node 24.
- Config files, HTTP requests and `--rule` reject unknown rule IDs, and
  `--rule` rejects invalid settings. Previously both were silently ignored.
- `POST /validate` rejects an `llm` section in the request config, requires
  `Content-Type: application/json`, limits bodies to 1 MiB and 1000 tools,
  sends no CORS headers, and no longer reads a config file from the working
  directory on each request (use `serve -c <path>`).
- With the 2026-07-28 revision, live stdio servers receive a minimal
  environment (`HOME`, `LOGNAME`, `PATH`, `SHELL`, `TERM`, `USER`) instead of
  the caller's full environment, matching the 2025-11-25 path.
- `metadata.configUsed` is relative to the working directory.

### Security

- HTTP service: a request could set `llm.baseUrl` and make the server send
  its own provider API key to any host. Combined with allow-all CORS, any web
  page could trigger this against a local instance. Both are fixed.
- Live discovery: pagination is capped at 100 pages, HTTP responses at
  10 MiB, and redirects are refused. Server output quoted in error messages
  is truncated.
- Human-readable output replaces terminal control characters in untrusted
  tool names, messages and LLM text.
- Dependency advisories are resolved: no high or critical findings remain in
  `npm audit`. The deprecated `@modelcontextprotocol/server-github` dev
  dependency is removed.

### Fixed

- The CLI did nothing when launched through `node_modules/.bin`
  (npm/npx shims) or a Windows path.
- Large JSON/SARIF output could be cut off when the CLI exited with `--ci`.
- Legacy (2025-11-25) discovery returned only the first page of tools.
- `--llm-provider openai` (or a config naming only a provider) kept the
  Anthropic default model.
- BP-007 overflowed the stack on long `oneOf`/`anyOf`/`allOf` chains.
- `POST /validate` returned 500 for malformed JSON and for non-object tool
  entries; it now returns 400.
- `serve` reported "listening" before binding and ignored bind errors.
- `serve -c <path>` was captured by the top-level `-c` option.
- The SARIF `$schema` URL and the SCH-009 documentation anchor were broken
  links.
- `npm run analyze:servers` used discovery the reference servers do not
  support and wrote absolute local paths into reports.

### Added

- `--timeout <ms>` and the `timeout` option of `validateServer()` for live
  discovery.
- The `discoverConfig` option of `validate()`, and `createApp()` options for
  config, limits and a structured logger.
- `serve -c <path>`; JSON-lines request logging without bodies or headers.
- ESLint, Prettier, coverage thresholds, a lychee link check, CodeQL,
  Dependabot, and a CI matrix on Node 22 and 24 with SHA-pinned actions.
- LICENSE, SECURITY.md, CONTRIBUTING.md, `.editorconfig`, issue and PR
  templates.
- Committed evidence for the Google Drive case study re-run on 2026-10-02.

### Changed

- Dependencies upgraded: Commander 15, Cosmiconfig 10, chalk 6, Vitest 5,
  TypeScript 6.0, MCP SDK 1.31, and current patch releases of hono, zod,
  ajv, yaml and the AI SDK.
- `--quiet` is implemented in the reporter instead of by filtering rendered
  text.
- Supported MCP revisions and LLM defaults are each defined in one place, and
  the default rule set is derived from the rule registry.
- The documentation is corrected throughout; see the pull request for the
  full list of claims that changed.

### Removed

- Unused helpers: `getAllRuleIds`, `isRuleRegistered`, `getRuleById`,
  `loadRuleModule`, `getEffectiveSeverity`, `isRuleEnabled`,
  `getRuleSeverity`, `hasToken`, and the `SCH_xxx` named exports. None were
  part of the public entry point.
- Claude Code commands that depended on the removed beads issue tracker.

## 0.1.0 - 2026-08-09

Initial development version: 57 rules, CLI, library, HTTP service, live
discovery for MCP 2025-11-25 and 2026-07-28, and human, JSON and SARIF
reports. It was never published to npm.

