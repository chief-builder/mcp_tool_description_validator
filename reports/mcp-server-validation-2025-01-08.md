# MCP Server Tool Validation Report

**Date:** 2025-01-08 (Updated: 2026-01-09)
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

**Key Finding:** All MCP servers achieve "Mature" ratings when using per-tool averaged scoring, though all have opportunities for improvement in LLM compatibility, security constraints, and best practices.

---

## Maturity Scores

| Server | Maintainer | Tools | Score | Level | Status |
|--------|------------|-------|-------|-------|--------|
| everything | Anthropic | 11 | **84** | Mature | Reliable for complex workflows |
| sqlite | Community | 5 | **82** | Mature | Reliable for complex workflows |
| sequential-thinking | Anthropic | 1 | **80** | Mature | Reliable for complex workflows |
| memory | Anthropic | 9 | **78** | Mature | Reliable for complex workflows |
| playwright | Microsoft | 22 | **75** | Mature | Reliable for complex workflows |
| filesystem | Anthropic | 14 | **71** | Mature | Reliable for complex workflows |

### Maturity Level Guide

| Score | Level | Description |
|-------|-------|-------------|
| 91-100 | Exemplary | Optimized for advanced multi-tool agents |
| 71-90 | Mature | Reliable for complex workflows |
| 41-70 | Moderate | Usable in simple agents; some guidance |
| 0-40 | Immature | High risk of misuse; basic functionality only |

### Scoring Formula (Per-Tool Averaged)

For each tool:
- Start at 100 points
- Each **error**: -5 points
- Each **warning**: -2 points
- Each **suggestion**: -1 point
- Floor at 0

**Server Score** = Average of all tool scores

This approach normalizes scoring across servers regardless of tool count, providing fair comparison.

---

## Detailed Results

### All Servers

| Server | Package | Tools | Valid | Errors | Warnings | Suggestions | Score |
|--------|---------|-------|-------|--------|----------|-------------|-------|
| everything | `@modelcontextprotocol/server-everything` | 11 | 3 | 11 | 23 | 71 | 84 |
| sqlite | `mcp-server-sqlite-npx` | 5 | 0 | 6 | 13 | 32 | 82 |
| sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | 1 | 0 | 1 | 3 | 9 | 80 |
| memory | `@modelcontextprotocol/server-memory` | 9 | 0 | 20 | 10 | 76 | 78 |
| playwright | `@playwright/mcp` | 22 | 0 | 55 | 76 | 114 | 75 |
| filesystem | `@modelcontextprotocol/server-filesystem` | 14 | 0 | 61 | 13 | 77 | 71 |
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
5. Calculate Score      Per-tool averaged (see Scoring Formula)
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

### Everything (Score: 84 - Mature)

Highest scoring server. Strengths:
- Good parameter descriptions on many tools
- Relatively fewer issues per tool

Room for improvement:
- NAM-002: Tool names use snake_case instead of kebab-case
- Missing MCP annotations (title, hints)
- Missing outputSchema

### SQLite (Score: 82 - Mature)

Simple server with 5 well-defined tools. Strengths:
- Focused tool set with clear purposes
- Reasonable parameter documentation

Room for improvement:
- NAM-002: All tools use snake_case naming
- SEC-001: String parameters lack maxLength constraints
- Missing some parameter descriptions

### Sequential Thinking (Score: 80 - Mature)

Single-tool server with comprehensive documentation. Strengths:
- Excellent tool description with workflow guidance
- Well-documented parameters

Room for improvement:
- NAM-002: Tool name should be `sequential-thinking` (kebab-case)
- Missing MCP annotations (title, hints)
- Missing outputSchema

### Memory (Score: 78 - Mature)

Knowledge graph server with good fundamentals. Strengths:
- Clear tool purposes
- Entity/relation model is well-structured

Room for improvement:
- NAM-002: All tools use snake_case naming
- Missing parameter descriptions
- No security constraints on string inputs

### Playwright (Score: 75 - Mature)

Microsoft's browser automation server. Despite having the most tools (22), maintains mature rating. Strengths:
- Comprehensive browser automation coverage
- Consistent tool structure

Room for improvement:
- NAM-002: All tools use `browser_` prefix with snake_case
- Many parameters lack descriptions
- Missing security constraints
- No MCP annotations

### Filesystem (Score: 71 - Mature)

Core file operations server. Scores lowest due to highest error density. Issues:
- NAM-002: All tools use snake_case naming
- LLM-006: Missing parameter descriptions (especially `path` parameters)
- SEC-001/SEC-004: No security constraints on string/path inputs
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
| `official-everything.json` | 11 | 11 | 84 | Mature |
| `thirdparty-sqlite.json` | 5 | 6 | 82 | Mature |
| `official-sequential-thinking.json` | 1 | 1 | 80 | Mature |
| `official-memory.json` | 9 | 20 | 78 | Mature |
| `thirdparty-playwright.json` | 22 | 55 | 75 | Mature |
| `official-filesystem.json` | 14 | 61 | 71 | Mature |

See `tests/fixtures/README.md` for regeneration instructions.

---

## Changelog

### 2026-01-09 (v0.1.1)
- **Fixed maturity scoring**: Changed from aggregate to per-tool averaged scoring
- Previous scoring penalized servers with more tools unfairly (all scored 0-12)
- New scoring normalizes across tool count (all servers now 71-84, Mature tier)

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

The validator identifies **154 errors** across **62 tools** from 6 MCP servers, with per-tool averaged maturity scores ranging from **71 to 84** (all in the "Mature" tier).

**Key insights:**
- All 6 servers achieve "Mature" ratings (71-90 range) with per-tool averaged scoring
- **Everything** scores highest (84) due to good parameter documentation
- **Filesystem** scores lowest (71) due to highest error density per tool
- The most impactful improvements would be:
  1. Switching to kebab-case naming (NAM-002)
  2. Adding parameter descriptions (LLM-006)
  3. Adding security constraints (SEC-001, SEC-004)

To reach "Exemplary" (91+), servers would need to address MCP annotations, outputSchema, and reduce errors to ~2 per tool.

---

*Generated by MCP Tool Validator v0.1.1*
*46 rules across 5 categories*
*Fixtures from live server connections via `--server` flag*
