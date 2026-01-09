# MCP Server Tool Validation Report

**Date:** 2025-01-08 (Updated: 2026-01-08)
**Validator Version:** 0.1.0
**MCP Spec Version:** 2025-11-25
**Rules:** 46 (SCH: 8, NAM: 6, SEC: 10, LLM: 13, BP: 9)

---

## Executive Summary

Validated **62 tools** from **6 MCP servers** (4 official Anthropic + 2 third-party).

| Metric | Count |
|--------|-------|
| Total Tools | 62 |
| Valid Tools | 3 |
| Total Errors | 154 |
| Total Warnings | 138 |
| Total Suggestions | 379 |

**Key Finding:** Most MCP tools have opportunities for improvement in LLM compatibility, security constraints, and best practices. Only the Sequential Thinking server achieves a "Mature" rating.

---

## Maturity Scores

| Server | Maintainer | Tools | Score | Level | Status |
|--------|------------|-------|-------|-------|--------|
| sequential-thinking | Anthropic | 1 | **80** | Mature | Reliable for complex workflows |
| sqlite | Community | 5 | **12** | Immature | High risk of misuse |
| everything | Anthropic | 11 | **0** | Immature | High risk of misuse |
| memory | Anthropic | 9 | **0** | Immature | High risk of misuse |
| filesystem | Anthropic | 14 | **0** | Immature | High risk of misuse |
| playwright | Microsoft | 22 | **0** | Immature | High risk of misuse |

### Maturity Level Guide

| Score | Level | Description |
|-------|-------|-------------|
| 91-100 | Exemplary | Optimized for advanced multi-tool agents |
| 71-90 | Mature | Reliable for complex workflows |
| 41-70 | Moderate | Usable in simple agents; some guidance |
| 0-40 | Immature | High risk of misuse; basic functionality only |

### Scoring Formula

- Start at 100 points
- Each **error**: -5 points
- Each **warning**: -2 points
- Each **suggestion**: -1 point
- Floor at 0

---

## Detailed Results

### All Servers

| Server | Package | Tools | Valid | Errors | Warnings | Suggestions | Score |
|--------|---------|-------|-------|--------|----------|-------------|-------|
| filesystem | `@modelcontextprotocol/server-filesystem` | 14 | 0 | 61 | 13 | 77 | 0 |
| memory | `@modelcontextprotocol/server-memory` | 9 | 0 | 20 | 10 | 76 | 0 |
| everything | `@modelcontextprotocol/server-everything` | 11 | 3 | 11 | 23 | 71 | 0 |
| sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | 1 | 0 | 1 | 3 | 9 | 80 |
| playwright | `@playwright/mcp` | 22 | 0 | 55 | 76 | 114 | 0 |
| sqlite | `mcp-server-sqlite-npx` | 5 | 0 | 6 | 13 | 32 | 12 |
| **Total** | | **62** | **3** | **154** | **138** | **379** | - |

### Issues by Category

| Category | filesystem | memory | everything | seq-thinking | playwright | sqlite | **Total** |
|----------|------------|--------|------------|--------------|------------|--------|-----------|
| Schema | 1 | 1 | 4 | 0 | 9 | 1 | **16** |
| Security | 33 | 9 | 9 | 1 | 38 | 7 | **97** |
| LLM-Compatibility | 51 | 29 | 33 | 7 | 106 | 14 | **240** |
| Naming | 15 | 9 | 11 | 1 | 44 | 7 | **87** |
| Best-Practice | 51 | 58 | 48 | 4 | 48 | 27 | **236** |

---

## Methodology

### Why Live Server Output?

MCP servers define tools using **TypeScript with Zod schemas**. At runtime, the MCP SDK converts these to **JSON Schema**. We validate against live server output because:

1. **Authoritative** - This is exactly what MCP clients receive
2. **No transcription errors** - Avoids manual Zod-to-JSON conversion mistakes
3. **Complete** - Includes all runtime-generated metadata

### Validation Process

```
1. Spawn MCP Server     $ npx -y <package-name> [args]
2. Connect via STDIO    Validator connects as MCP client
3. Request Tool List    Send: { method: "tools/list" }
4. Validate Each Tool   Apply 46 rules across 5 categories
5. Calculate Score      100 - (5×errors + 2×warnings + 1×suggestions)
6. Output Results       Save as JSON fixture
```

---

## Common Issues Found

### Top Errors (by frequency)

1. **NAM-002**: Tool names using snake_case instead of kebab-case
2. **SEC-001**: String parameters missing `maxLength` constraint
3. **SEC-004**: File path parameters missing pattern validation
4. **LLM-006**: Parameters missing descriptions

### Top Warnings

1. **SEC-003**: Number parameters missing min/max constraints
2. **LLM-004**: Tool descriptions don't explain when to use the tool
3. **LLM-012**: Inconsistent description styles across related tools

### Top Suggestions

1. **BP-001**: Missing title annotation for display purposes
2. **BP-002**: Missing readOnlyHint annotation
3. **BP-009**: Missing outputSchema
4. **LLM-005**: Tool descriptions don't include usage examples
5. **LLM-013**: Missing workflow guidance

---

## Server Analysis

### Sequential Thinking (Score: 80 - Mature)

The only server to achieve a mature rating. Why it scores well:
- Only 1 tool to validate (less surface area for issues)
- Comprehensive tool description with workflow guidance
- Well-documented parameters with descriptions

Room for improvement:
- NAM-002: Tool name should be `sequential-thinking` (kebab-case)
- Missing MCP annotations (title, hints)
- Missing outputSchema

### SQLite (Score: 12 - Immature)

Relatively simple server with 5 tools. Issues:
- All tools use snake_case naming
- String parameters lack maxLength constraints
- Missing parameter descriptions in some tools

### Official Anthropic Servers (Score: 0 - Immature)

The filesystem, memory, and everything servers share common patterns:
- All use snake_case naming (should be kebab-case)
- Missing parameter descriptions (especially `path` parameters)
- No security constraints on string inputs
- No MCP annotations

### Playwright (Score: 0 - Immature)

Microsoft's browser automation server has the most tools (22) and issues:
- All tools use `browser_` prefix with snake_case
- Many parameters lack descriptions
- Missing security constraints
- No MCP annotations

---

## Recommendations

### For MCP Server Authors

1. **Use kebab-case for tool names** (e.g., `read-file` not `read_file`)
2. **Add descriptions to all parameters** - LLMs need context to use tools correctly
3. **Add security constraints** to string parameters:
   - `maxLength` for string inputs
   - `pattern` for path/URL validation
   - `minimum`/`maximum` for numeric inputs
4. **Include usage examples** in tool descriptions
5. **Add MCP annotations** (title, readOnlyHint, destructiveHint, idempotentHint)
6. **Provide outputSchema** for response validation

### Target Scores

| Use Case | Minimum Score | Level |
|----------|---------------|-------|
| Internal/prototype tools | 40+ | Moderate |
| Production tools | 70+ | Mature |
| Public SDK/library | 90+ | Exemplary |

---

## Commands Executed

```bash
# Official Anthropic Servers
node dist/cli.js --server "npx -y @modelcontextprotocol/server-filesystem /tmp" \
  --format json 2>/dev/null > tests/fixtures/official-filesystem.json

node dist/cli.js --server "npx -y @modelcontextprotocol/server-memory" \
  --format json 2>/dev/null > tests/fixtures/official-memory.json

node dist/cli.js --server "npx -y @modelcontextprotocol/server-everything" \
  --format json 2>/dev/null > tests/fixtures/official-everything.json

node dist/cli.js --server "npx -y @modelcontextprotocol/server-sequential-thinking" \
  --format json 2>/dev/null > tests/fixtures/official-sequential-thinking.json

# Third-Party Servers
node dist/cli.js --server "npx -y @playwright/mcp@latest" \
  --format json 2>/dev/null > tests/fixtures/thirdparty-playwright.json

node dist/cli.js --server "npx -y mcp-server-sqlite-npx /tmp/test.db" \
  --format json 2>/dev/null > tests/fixtures/thirdparty-sqlite.json
```

---

## Fixture Files

| File | Tools | Errors | Score | Level |
|------|-------|--------|-------|-------|
| `official-filesystem.json` | 14 | 61 | 0 | Immature |
| `official-memory.json` | 9 | 20 | 0 | Immature |
| `official-everything.json` | 11 | 11 | 0 | Immature |
| `official-sequential-thinking.json` | 1 | 1 | 80 | Mature |
| `thirdparty-playwright.json` | 22 | 55 | 0 | Immature |
| `thirdparty-sqlite.json` | 5 | 6 | 12 | Immature |

See `tests/fixtures/README.md` for regeneration instructions.

---

## Changelog

### 2026-01-08 (v0.1.0)
- Added maturity scoring (0-100) with four levels
- Added BP-009: outputSchema validation
- Added LLM-013: workflow guidance detection
- Fixed critical bug: rules now load correctly (was 0 rules, now 46)
- Total rules increased from 44 to 46

### Calibration Fixes (2025-01-07)

| Commit | Rule | Fix |
|--------|------|-----|
| `53aa8d2` | SEC-001 | Content fields exempt from `maxLength` |
| `37ffb22` | NAM-005 | Expanded allowed verbs list |
| `751a949` | LLM-008 | Tool name provides parameter context |

---

## Conclusion

The validator now correctly identifies **154 errors** across **62 tools** from 6 MCP servers, with maturity scores ranging from **0 to 80**.

**Key insights:**
- Only **Sequential Thinking** achieves a "Mature" rating (80/100)
- Most servers score 0-12 due to accumulated errors and warnings
- The most impactful improvements would be:
  1. Switching to kebab-case naming
  2. Adding parameter descriptions
  3. Adding security constraints (maxLength, patterns)

These findings provide actionable feedback for MCP server authors to improve LLM compatibility and achieve higher maturity scores.

---

*Generated by MCP Tool Validator v0.1.0*
*46 rules across 5 categories*
*Fixtures from live server connections via `--server` flag*
