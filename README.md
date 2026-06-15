# MCP Tool Validator

[![CI](https://github.com/chief-builder/mcp_tool_description_validator/actions/workflows/ci.yml/badge.svg)](https://github.com/chief-builder/mcp_tool_description_validator/actions/workflows/ci.yml)

A governance validator for Model Context Protocol (MCP) tool definitions. It checks whether tools are clear enough for LLMs to select, bounded enough to use safely, and structured enough to integrate into CI.

[View the project page](https://chief-builder.github.io/mcp_tool_description_validator/) | [Rule reference](docs/RULES.md) | [Best practices](docs/BEST_PRACTICES.md)

## Why This Exists

MCP servers can expose dozens of tools, and the model only sees the names, descriptions, annotations, and schemas you give it. Vague names, missing parameter descriptions, unbounded strings, and absent behavior hints make agents more likely to choose the wrong tool or call the right tool with unsafe arguments.

MCP Tool Validator turns those review instincts into repeatable checks:

- Are tool names and parameter names predictable?
- Does each description explain what the tool does and when to use it?
- Are user-controlled strings, arrays, file paths, URLs, and sensitive fields constrained?
- Do annotations communicate read-only, destructive, idempotent, and open-world behavior?
- Can CI block risky tool definitions before they ship?

## What It Includes

- **46 validation rules** across schema, naming, security, LLM compatibility, and best practices
- **Maturity scoring** from 0-100 with `immature`, `moderate`, `mature`, and `exemplary` levels
- **CLI validation** for JSON and YAML files
- **Live MCP server validation** through `--server`
- **Programmatic API** for build tools and custom quality gates
- **HTTP service** with `/health` and `/validate`
- **Human, JSON, and SARIF reporters** for local use, scripts, and code scanning workflows

## Quick Start

```bash
git clone https://github.com/chief-builder/mcp_tool_description_validator.git
cd mcp_tool_description_validator
npm install
npm run build
```

Validate the included examples:

```bash
node ./dist/cli.js examples/polished-tools.json
node ./dist/cli.js examples/needs-work-tools.json --verbose
```

Use CI mode to fail builds when validation errors are present:

```bash
node ./dist/cli.js tools.json --ci
```

Emit machine-readable reports:

```bash
node ./dist/cli.js tools.json --format json
node ./dist/cli.js tools.json --format sarif > validation.sarif
```

## CLI Usage

```bash
mcp-validate [file] [options]
```

Common options:

| Option | Description |
| --- | --- |
| `--format human\|json\|sarif` | Choose output format. |
| `--ci` | Exit with code `1` when validation errors are present. |
| `--config <path>` | Load `.mcp-validate.json`, `.mcp-validate.yaml`, or another config path. |
| `--rule RULE-ID=off` | Disable or override a single rule. |
| `--server <url-or-command>` | Validate tools exposed by a live MCP server. |
| `--verbose` | Include suggestions in human output. |

Rule overrides accept `on`, `off`, `error`, `warning`, or `suggestion`:

```bash
mcp-validate tools.json --rule BP-001=off --rule SEC-001=error
```

## HTTP Service

Start a local validation service:

```bash
npm run build
node ./dist/cli.js serve --port 8080
```

Check health:

```bash
curl http://localhost:8080/health
```

Validate tools:

```bash
curl -X POST http://localhost:8080/validate \
  -H 'Content-Type: application/json' \
  --data @examples/polished-tools.json
```

The service accepts:

```json
{
  "tools": [
    {
      "name": "search-knowledge-base",
      "description": "Searches approved support articles by keyword. Use this when answering product or troubleshooting questions. Example: search for password reset.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "searchText": {
            "type": "string",
            "description": "Customer question or troubleshooting phrase to search for, minimum length 3 characters and maximum length 200 characters.",
            "minLength": 3,
            "maxLength": 200
          }
        },
        "required": ["searchText"]
      }
    }
  ],
  "config": {
    "rules": {
      "BP-001": false
    }
  }
}
```

## Programmatic Usage

```typescript
import { validate, validateFile, validateServer } from 'mcp-tool-validator';

const result = await validateFile('./tools.json');

console.log(result.valid);
console.log(result.summary.maturityScore);
console.log(result.issues);

const inlineResult = await validate([
  {
    name: 'search-knowledge-base',
    description:
      'Searches approved support articles by keyword. Use this when answering product or troubleshooting questions. Example: search for password reset.',
    inputSchema: {
      type: 'object',
      properties: {
        searchText: {
          type: 'string',
          description:
            'Customer question or troubleshooting phrase to search for, minimum length 3 characters and maximum length 200 characters.',
          minLength: 3,
          maxLength: 200,
        },
      },
      required: ['searchText'],
    },
    source: {
      type: 'file',
      location: 'inline',
      raw: {},
    },
  },
]);

const liveServerResult = await validateServer('http://localhost:3000/mcp');
```

## Rule Categories

| Category | Prefix | Count | Focus |
| --- | --- | ---: | --- |
| Schema Validation | `SCH` | 8 | MCP protocol compliance and JSON Schema validity |
| Naming Conventions | `NAM` | 6 | Consistent, descriptive tool and parameter naming |
| Security Constraints | `SEC` | 10 | Input validation and safety constraints |
| LLM Compatibility | `LLM` | 13 | Descriptions and parameters that models can use reliably |
| Best Practices | `BP` | 9 | MCP annotations, output schemas, and tool usability |

See [docs/RULES.md](docs/RULES.md) for the complete rule catalog.

## Maturity Scoring

Each tool starts at 100 points. Issues deduct points by severity, and the server score is the average across tools.

| Score | Level | Meaning |
| --- | --- | --- |
| 91-100 | Exemplary | Optimized for advanced multi-tool agents |
| 71-90 | Mature | Reliable for complex workflows |
| 41-70 | Moderate | Usable in simple agents, with some guidance gaps |
| 0-40 | Immature | High risk of misuse |

## Configuration

Create `.mcp-validate.json` or `.mcp-validate.yaml` in your project root:

```json
{
  "rules": {
    "BP-001": "off",
    "SEC-001": "error"
  },
  "output": {
    "format": "human",
    "verbose": false,
    "color": true
  }
}
```

## Development

```bash
npm install
npm run typecheck
npm run build
npm run test:run
npm run check
```

The current suite covers rule behavior, parser formats, reporters, CLI integration, and the HTTP service.

## Publishing Notes

Before publishing or highlighting this project:

- Enable GitHub Pages from `/docs` to serve the project page.
- Add a release workflow or npm publish checklist.
- Decide whether the HTTP service should stay local-only or get a hosted demo.
- Run a dependency security pass; the current dependency graph includes audit findings that need review.

## License

MIT
