# MCP Tool Description Validator

A governance validator for Model Context Protocol (MCP) tool definitions that ensures quality, security, and LLM-compatibility.

## Overview

The MCP Tool Description Validator analyzes MCP tool definitions and provides actionable feedback to improve:

- **LLM Compatibility**: Ensure tools are easy for language models to understand and use correctly
- **Security**: Identify potential vulnerabilities in input handling and parameter design
- **Best Practices**: Follow MCP specification conventions and community guidelines
- **Consistency**: Maintain uniform naming and description patterns across tool suites

## Features

- **46 Validation Rules** across 5 categories
- **Maturity Scoring** (0-100) with level classification
- **CLI Tool** for local validation
- **Programmatic API** for integration into build pipelines
- **Multiple Input Formats**: JSON, YAML, and MCP server definitions

## Installation

```bash
npm install mcp-tool-validator
```

## Quick Start

### CLI Usage

```bash
# Validate a JSON file with tool definitions
mcp-validate tools.json

# Validate with specific severity threshold
mcp-validate tools.json --min-severity warning

# Output as JSON for CI/CD integration
mcp-validate tools.json --format json
```

### Programmatic Usage

```typescript
import { validateTools } from 'mcp-tool-validator';

const tools = [
  {
    name: 'get-user',
    description: 'Retrieves user information by ID. Use this when you need user details.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'The unique identifier of the user',
          maxLength: 100
        }
      },
      required: ['userId']
    }
  }
];

const result = await validateTools(tools);
console.log(`Maturity Score: ${result.score}/100 (${result.maturityLevel})`);
console.log(`Issues: ${result.issues.length}`);
```

## Validation Rules

The validator implements 46 rules organized into 5 categories:

| Category | Prefix | Count | Description |
|----------|--------|-------|-------------|
| Schema Validation | SCH | 8 | MCP protocol compliance and JSON Schema validity |
| Naming Conventions | NAM | 6 | Consistent, descriptive tool and parameter naming |
| Security Constraints | SEC | 10 | Input validation and security best practices |
| LLM Compatibility | LLM | 13 | Optimizing tool definitions for LLM understanding |
| Best Practices | BP | 9 | MCP annotations, schema design, and usability |

See [docs/RULES.md](docs/RULES.md) for the complete rule reference with examples.

## Maturity Scoring

The validator calculates a **per-tool averaged** maturity score (0-100) based on rule compliance. Each tool starts at 100 points, deductions are applied per issue, and the server score is the average across all tools.

| Score | Level | Description |
|-------|-------|-------------|
| **91-100** | Exemplary | Optimized for advanced multi-tool agents |
| **71-90** | Mature | Reliable for complex workflows |
| **41-70** | Moderate | Usable in simple agents; some guidance |
| **0-40** | Immature | High risk of misuse; basic functionality only |

### Severity Impact

Each rule has a severity level that affects per-tool scoring:

| Severity | Deduction | Examples |
|----------|-----------|----------|
| `error` | -5 points | Missing required fields, security vulnerabilities |
| `warning` | -2 points | Suboptimal descriptions, missing constraints |
| `suggestion` | -1 point | Missing annotations, style recommendations |

## Validation Philosophy

This validator is designed around key principles from the MCP specification and LLM best practices:

### For LLM Understanding

- **Concise descriptions** (20-500 characters) with action verbs
- **Front-loaded information** - critical details first
- **Workflow guidance** - prerequisites, alternatives, sequencing
- **Clear parameter descriptions** with examples and constraints

### For Security

- **Bounded inputs** - maxLength for strings, maxItems for arrays
- **Validated formats** - URI format for URLs, patterns for file paths
- **Sensitive data handling** - no defaults for secrets, flagged for review
- **Controlled enums** - restrict command/action parameters when possible

### For Maintainability

- **Consistent naming** - kebab-case for tools, camelCase for parameters
- **MCP annotations** - title, readOnlyHint, destructiveHint, idempotentHint
- **Schema reuse** - $ref for repeated patterns
- **Reasonable complexity** - max 10 parameters, max 4 nesting levels

## Configuration

Create a `.mcp-validate.json` or `.mcp-validate.yaml` file in your project root:

```json
{
  "rules": {
    "BP-001": "off",
    "SEC-001": "error"
  },
  "minScore": 70,
  "failOnError": true
}
```

## Examples

### Good Tool Definition

```json
{
  "name": "create-document",
  "description": "Creates a new document in the specified folder. Use this when the user wants to create a new file. Returns the document ID on success.",
  "annotations": {
    "title": "Create Document",
    "readOnlyHint": false,
    "destructiveHint": false,
    "idempotentHint": false
  },
  "inputSchema": {
    "type": "object",
    "properties": {
      "folderId": {
        "type": "string",
        "description": "Target folder identifier (max 64 characters)",
        "maxLength": 64
      },
      "title": {
        "type": "string",
        "description": "Document title (max 200 characters)",
        "maxLength": 200
      },
      "content": {
        "type": "string",
        "description": "Initial document content in Markdown format"
      }
    },
    "required": ["folderId", "title"]
  },
  "outputSchema": {
    "type": "object",
    "description": "Created document information",
    "properties": {
      "documentId": {
        "type": "string",
        "description": "Unique identifier of the created document"
      },
      "createdAt": {
        "type": "string",
        "format": "date-time",
        "description": "Creation timestamp in ISO 8601 format"
      }
    }
  }
}
```

### Tool Definition with Issues

```json
{
  "name": "getData",
  "description": "Gets data",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string"
      }
    }
  }
}
```

Issues detected:
- NAM-002: Tool name must use kebab-case format
- LLM-002: Description too short (9 characters, minimum 20)
- LLM-003: Description doesn't explain what the tool does
- LLM-004: Description doesn't explain when to use the tool
- LLM-006: Parameter 'id' is missing a description
- SEC-001: String parameter 'id' is missing maxLength constraint
- SCH-007: inputSchema has properties but no "required" array
- BP-001: Tool is missing title annotation
- BP-002: Tool is missing readOnlyHint annotation
- BP-009: Tool is missing outputSchema

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## Documentation

- [docs/RULES.md](docs/RULES.md) - Complete rule reference with examples
- [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md) - Best practices and maturity scoring framework

## License

MIT
