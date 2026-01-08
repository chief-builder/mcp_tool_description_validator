# Plan: Test Validator Against Official MCP Servers

## Objective
Test the MCP Tool Definition Validator against official Anthropic MCP servers to validate its effectiveness and identify any issues with rule coverage or false positives.

## Target MCP Servers (Official Reference Implementations)

| Server | npm Package | Description |
|--------|-------------|-------------|
| Filesystem | `@modelcontextprotocol/server-filesystem` | Secure file operations |
| Git | `@modelcontextprotocol/server-git` | Git repository operations |
| Fetch | `@modelcontextprotocol/server-fetch` | Web content fetching |
| Memory | `@modelcontextprotocol/server-memory` | Knowledge graph persistence |
| Everything | `@modelcontextprotocol/server-everything` | Reference/test server |

## Implementation Steps

1. **Install official MCP server packages as dev dependencies**

2. **Create test harness script** (`scripts/test-official-servers.ts`)
   - Connect to each server via STDIO transport
   - Fetch tool definitions using `listTools()`
   - Run validator against each server's tools
   - Generate per-server JSON reports
   - Generate summary markdown report

3. **Execute tests and commit results**

## Output Structure
```
reports/
  filesystem.json       # Validation results for filesystem server
  git.json              # Validation results for git server
  fetch.json            # Validation results for fetch server
  memory.json           # Validation results for memory server
  everything.json       # Validation results for everything server
  summary.md            # Aggregated human-readable report
```

## Commands

```bash
# Install server packages
npm install -D @modelcontextprotocol/server-filesystem \
  @modelcontextprotocol/server-git \
  @modelcontextprotocol/server-fetch \
  @modelcontextprotocol/server-memory \
  @modelcontextprotocol/server-everything

# Run tests
npx tsx scripts/test-official-servers.ts
```

## Files to Create
- `scripts/test-official-servers.ts` - Test harness script
- `reports/*.json` - Per-server validation results
- `reports/summary.md` - Human-readable summary

## Verification
1. Run test harness against all 5 official servers
2. Verify each server returns tool definitions
3. Review validation results for accuracy
4. Commit reports to repository
