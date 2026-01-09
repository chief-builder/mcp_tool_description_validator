# Official MCP Server Fixtures

## Approach

These fixtures contain tool definitions extracted from **live MCP servers** using the validator's `--server` flag.

### Why Live Server Output?

1. **Source files use Zod** - The official MCP servers define tools using TypeScript with Zod schemas
2. **Runtime conversion** - The MCP SDK converts Zod schemas to JSON Schema at runtime
3. **Authoritative definitions** - The live server output is what MCP clients actually receive
4. **No manual transcription** - Avoids human error from manually converting Zod to JSON Schema

### Step-by-Step Process

#### Step 1: Install the MCP server package
```bash
npx -y @modelcontextprotocol/server-<name>
```

#### Step 2: Connect validator to live server
```bash
node dist/cli.js --server "npx -y @modelcontextprotocol/server-<name> [args]" --format json
```

#### Step 3: The validator:
- Spawns the MCP server as a child process
- Connects via STDIO transport
- Sends `tools/list` request per MCP protocol
- Receives tool definitions with JSON Schema
- Validates each tool against 44 rules
- Outputs results as JSON

#### Step 4: Save output as fixture
```bash
node dist/cli.js --server "..." --format json 2>/dev/null > tests/fixtures/official-<name>.json
```

### Servers Validated

#### Official Anthropic Servers

| Server | Package | Command |
|--------|---------|---------|
| filesystem | `@modelcontextprotocol/server-filesystem` | `npx -y @modelcontextprotocol/server-filesystem /tmp` |
| memory | `@modelcontextprotocol/server-memory` | `npx -y @modelcontextprotocol/server-memory` |
| everything | `@modelcontextprotocol/server-everything` | `npx -y @modelcontextprotocol/server-everything` |
| sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | `npx -y @modelcontextprotocol/server-sequential-thinking` |

#### Third-Party Servers

| Server | Maintainer | Package | Command |
|--------|------------|---------|---------|
| playwright | Microsoft | `@playwright/mcp` | `npx -y @playwright/mcp@latest` |
| sqlite | Community | `mcp-server-sqlite-npx` | `npx -y mcp-server-sqlite-npx /path/to/db` |

### Fixture Contents

Each JSON fixture contains:
```json
{
  "valid": true|false,
  "summary": {
    "totalTools": <number>,
    "validTools": <number>,
    "issuesByCategory": {...},
    "issuesBySeverity": {...}
  },
  "issues": [...],
  "tools": [
    {
      "name": "tool-name",
      "valid": true|false,
      "tool": {
        "name": "...",
        "description": "...",
        "inputSchema": { /* JSON Schema */ },
        "source": {
          "type": "server",
          "location": "npx -y @modelcontextprotocol/server-...",
          "raw": { /* original tool definition from server */ }
        }
      },
      "issues": [...]
    }
  ],
  "metadata": {
    "validatorVersion": "0.1.0",
    "mcpSpecVersion": "2025-11-25",
    "timestamp": "...",
    "duration": <ms>
  }
}
```

### Regenerating Fixtures

To regenerate all fixtures:
```bash
npm run build

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

### Date Generated

See `metadata.timestamp` in each fixture file.
