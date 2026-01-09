# MCP Server Tool Validation Report

**Date:** 2025-01-08 (Updated: 2026-01-08)
**Validator Version:** 0.1.0
**MCP Spec Version:** 2025-11-25

---

## Executive Summary

Validated **62 tools** from **6 MCP servers** (4 official Anthropic + 2 third-party).

| Metric | Count |
|--------|-------|
| Total Tools | 62 |
| Valid Tools | 3 |
| Total Errors | 154 |
| Total Warnings | 138 |
| Total Suggestions | 236 |

**Key Finding:** Most MCP tools have opportunities for improvement in LLM compatibility, security constraints, and best practices.

---

## Methodology

### Why Live Server Output?

MCP servers define tools using **TypeScript with Zod schemas**. At runtime, the MCP SDK converts these to **JSON Schema**. We validate against live server output because:

1. **Authoritative** - This is exactly what MCP clients receive
2. **No transcription errors** - Avoids manual Zod-to-JSON conversion mistakes
3. **Complete** - Includes all runtime-generated metadata

### Step-by-Step Process

```
1. Spawn MCP Server     $ npx -y <package-name> [args]
2. Connect via STDIO    Validator connects as MCP client
3. Request Tool List    Send: { method: "tools/list" }
4. Validate Each Tool   Apply 44 rules across 5 categories
5. Output Results       Save as JSON fixture
```

---

## Results Summary

### All Servers

| Server | Maintainer | Package | Tools | Valid | Errors | Warnings | Suggestions |
|--------|------------|---------|-------|-------|--------|----------|-------------|
| filesystem | Anthropic | `@modelcontextprotocol/server-filesystem` | 14 | 0 | 61 | 13 | 38 |
| memory | Anthropic | `@modelcontextprotocol/server-memory` | 9 | 0 | 20 | 10 | 49 |
| everything | Anthropic | `@modelcontextprotocol/server-everything` | 11 | 3 | 11 | 23 | 49 |
| sequential-thinking | Anthropic | `@modelcontextprotocol/server-sequential-thinking` | 1 | 0 | 1 | 3 | 7 |
| playwright | Microsoft | `@playwright/mcp` | 22 | 0 | 55 | 76 | 71 |
| sqlite | Community | `mcp-server-sqlite-npx` | 5 | 0 | 6 | 13 | 22 |
| **Total** | | | **62** | **3** | **154** | **138** | **236** |

### Issues by Category

| Category | filesystem | memory | everything | seq-thinking | playwright | sqlite | **Total** |
|----------|------------|--------|------------|--------------|------------|--------|-----------|
| Schema | 1 | 1 | 4 | 0 | 9 | 1 | **16** |
| Security | 33 | 9 | 9 | 1 | 38 | 7 | **97** |
| LLM-Compatibility | 37 | 20 | 24 | 6 | 84 | 9 | **180** |
| Naming | 15 | 9 | 11 | 1 | 44 | 7 | **87** |
| Best-Practice | 26 | 40 | 35 | 3 | 27 | 17 | **148** |

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
3. **LLM-005**: Tool descriptions don't include usage examples

---

## Server Details

### Official Anthropic Servers

#### Filesystem Server (14 tools, 61 errors)

| Tool | Errors | Key Issues |
|------|--------|------------|
| `read_file` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `read_text_file` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `read_media_file` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `read_multiple_files` | 5 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `write_file` | 5 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `edit_file` | 5 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `create_directory` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `list_directory` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `list_directory_with_sizes` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `directory_tree` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `move_file` | 5 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `search_files` | 5 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `get_file_info` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |
| `list_allowed_directories` | 4 | NAM-002, SEC-001, SEC-004, LLM-006 |

**Common pattern:** All tools use snake_case naming (should be kebab-case) and have `path` parameters without descriptions or security constraints.

#### Memory Server (9 tools, 20 errors)

| Tool | Errors | Key Issues |
|------|--------|------------|
| `create_entities` | 2 | NAM-002, SEC-001 |
| `create_relations` | 2 | NAM-002, SEC-001 |
| `add_observations` | 2 | NAM-002, SEC-001 |
| `delete_entities` | 2 | NAM-002, SEC-001 |
| `delete_observations` | 2 | NAM-002, SEC-001 |
| `delete_relations` | 2 | NAM-002, SEC-001 |
| `read_graph` | 2 | NAM-002, LLM-002 |
| `search_nodes` | 3 | NAM-002, SEC-001, LLM-006 |
| `open_nodes` | 3 | NAM-002, SEC-001, LLM-006 |

#### Everything Server (11 tools, 11 errors)

Only server with some valid tools (3 valid: `add`, `zip`, `getResourceLinks`).

| Tool | Status | Issues |
|------|--------|--------|
| `echo` | Invalid | LLM-006 (missing param description) |
| `add` | **Valid** | - |
| `longRunningOperation` | Invalid | LLM-006 |
| `printEnv` | Invalid | SEC-001, LLM-006 |
| `sampleLLM` | Invalid | SEC-001, LLM-006 |
| `getTinyImage` | Invalid | LLM-002 (short description) |
| `annotatedMessage` | Invalid | SEC-001, LLM-006 |
| `getResourceReference` | Invalid | SEC-001 |
| `getResourceLinks` | **Valid** | - |
| `structuredContent` | Invalid | LLM-006 |
| `zip` | **Valid** | - |

#### Sequential Thinking Server (1 tool, 1 error)

| Tool | Error |
|------|-------|
| `sequentialthinking` | NAM-002 (should be `sequential-thinking`) |

---

### Third-Party Servers

#### Playwright MCP Server - Microsoft (22 tools, 55 errors)

**Package:** `@playwright/mcp`

| Tool | Errors | Key Issues |
|------|--------|------------|
| `browser_close` | 2 | NAM-002, LLM-002 |
| `browser_resize` | 3 | NAM-002, SEC-003, LLM-006 |
| `browser_console_messages` | 2 | NAM-002, LLM-002 |
| `browser_handle_dialog` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_evaluate` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_file_upload` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_fill_form` | 2 | NAM-002, LLM-006 |
| `browser_install` | 2 | NAM-002, LLM-002 |
| `browser_press_key` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_type` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_navigate` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_navigate_back` | 2 | NAM-002, LLM-002 |
| `browser_network_requests` | 2 | NAM-002, LLM-002 |
| `browser_run_code` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_take_screenshot` | 2 | NAM-002, LLM-006 |
| `browser_snapshot` | 2 | NAM-002, LLM-006 |
| `browser_click` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_drag` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_hover` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_select_option` | 3 | NAM-002, SEC-001, LLM-006 |
| `browser_tabs` | 2 | NAM-002, LLM-002 |
| `browser_wait_for` | 2 | NAM-002, LLM-006 |

**Common pattern:** All tools use snake_case naming with `browser_` prefix (should be `browser-*` kebab-case).

#### SQLite MCP Server - Community (5 tools, 6 errors)

**Package:** `mcp-server-sqlite-npx`

| Tool | Errors | Key Issues |
|------|--------|------------|
| `read_query` | 2 | NAM-002, SEC-001 |
| `write_query` | 2 | NAM-002, SEC-001 |
| `create_table` | 1 | NAM-002 |
| `list_tables` | 1 | NAM-002 |
| `describe_table` | 0 | - |

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

### For the MCP Specification

Consider updating the spec to:
1. Recommend or require parameter descriptions
2. Provide naming convention guidance
3. Define security best practices for common parameter types

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

| File | Size | Tools | Errors |
|------|------|-------|--------|
| `tests/fixtures/official-filesystem.json` | ~50 KB | 14 | 61 |
| `tests/fixtures/official-memory.json` | ~45 KB | 9 | 20 |
| `tests/fixtures/official-everything.json` | ~35 KB | 11 | 11 |
| `tests/fixtures/official-sequential-thinking.json` | ~15 KB | 1 | 1 |
| `tests/fixtures/thirdparty-playwright.json` | ~80 KB | 22 | 55 |
| `tests/fixtures/thirdparty-sqlite.json` | ~12 KB | 5 | 6 |

See `tests/fixtures/README.md` for regeneration instructions.

---

## Bug Fix History

### Critical Bug Fixed (2026-01-08)

**Problem:** All 62 tools passed validation with 0 issues.

**Root Cause:** Dynamic imports (`await import('./llm-compatibility/llm-006.js')`) failed silently because tsup bundles all code into chunks - individual rule files don't exist in `dist/`.

**Fix:** Replaced dynamic imports with static imports via category rule arrays.

**Files Modified:**
- `src/rules/schema/index.ts` - Added `schemaRules` array
- `src/rules/naming/index.ts` - Added `namingRules` array
- `src/rules/security/index.ts` - Added `securityRules` array
- `src/rules/index.ts` - Static registry instead of dynamic imports
- `src/core/rule-loader.ts` - Uses static registry

### Calibration Fixes (2025-01-07)

| Commit | Rule | Fix |
|--------|------|-----|
| `53aa8d2` | SEC-001 | Content fields exempt from `maxLength` |
| `37ffb22` | NAM-005 | Expanded allowed verbs list |
| `751a949` | LLM-008 | Tool name provides parameter context |

---

## Conclusion

The validator now correctly identifies **154 errors** across **62 tools** from 6 MCP servers. The most common issues are:

1. **Naming conventions** - snake_case instead of kebab-case (NAM-002)
2. **Missing security constraints** - No maxLength/pattern on strings (SEC-001, SEC-004)
3. **Missing parameter descriptions** - LLMs can't understand usage (LLM-006)
4. **Missing annotations** - No title/hints for UI display (BP-001, BP-002)

These findings provide actionable feedback for MCP server authors to improve LLM compatibility.

---

*Generated by MCP Tool Validator v0.1.0*
*Fixtures from live server connections via `--server` flag*
