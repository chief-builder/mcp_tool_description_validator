# MCP Tool Definition Validator Specification

## Overview

A governance validator for Model Context Protocol (MCP) tool definitions that ensures quality, security, and LLM-compatibility. The validator analyzes MCP tool definitions from both static files and live servers, producing comprehensive reports for developers, security teams, and MCP client applications.

### Goals

1. **Quality Assurance**: Ensure tool definitions follow MCP specification (2025-11-25) and best practices
2. **Security Validation**: Detect input validation gaps, scope issues, and data exposure risks
3. **LLM Compatibility**: Verify tool descriptions are clear, unambiguous, and optimized for LLM understanding
4. **CI/CD Integration**: Provide machine-readable output for automated validation pipelines

### Non-Goals

- Runtime tool execution monitoring
- MCP server implementation validation (beyond tool definitions)
- Custom plugin system for user-defined rules
- Category-specific validation rules (file system, database, etc.)
- Multi-version protocol support (validates against 2025-11-25 only)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Entry Points                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   CLI (bin/)    │   Library API   │    HTTP Service             │
│   mcp-validate  │   validate()    │    POST /validate           │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Validator                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Parser    │  │  Rule       │  │  Reporter   │              │
│  │   Layer     │──│  Engine     │──│  Layer      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│        │                │                │                       │
│        ▼                ▼                ▼                       │
│  ┌───────────────────────────────────────────────────────┐      │
│  │               Validation Rules                         │      │
│  ├───────────────┬───────────────┬───────────────────────┤      │
│  │  Schema       │  Security     │  LLM Compatibility    │      │
│  │  Validation   │  Checks       │  Analysis             │      │
│  └───────────────┴───────────────┴───────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Input Sources                                 │
├─────────────────────────────┬───────────────────────────────────┤
│   Static Files              │   Live MCP Servers                │
│   (JSON/YAML)               │   (via MCP Protocol)              │
└─────────────────────────────┴───────────────────────────────────┘
```

### Components

#### 1. Parser Layer
- **Static File Parser**: Reads JSON/YAML tool definition files
- **MCP Client**: Connects to live servers, calls `tools/list` endpoint
- **Schema Normalizer**: Converts all inputs to canonical internal format

#### 2. Rule Engine
- **Rule Registry**: Maintains all validation rules with metadata
- **Configuration Manager**: Handles rule enable/disable via config
- **Execution Engine**: Runs applicable rules against tool definitions

#### 3. Reporter Layer
- **Human Reporter**: Terminal output with colors, formatting
- **JSON Reporter**: Structured output for automation
- **SARIF Reporter**: Static Analysis Results Interchange Format for IDE/CI integration

#### 4. LLM Analysis Module (Optional)
- **Provider Abstraction**: Interface for multiple LLM providers
- **Analysis Prompts**: Standardized prompts for description evaluation
- **Result Parser**: Extracts structured feedback from LLM responses

---

## Data Models

### Tool Definition (Internal)

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations?: ToolAnnotations;
  // Metadata from parsing
  source: ToolSource;
}

interface ToolSource {
  type: 'file' | 'server';
  location: string;  // File path or server URL
  raw: unknown;      // Original unparsed data
}

interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}
```

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  summary: ValidationSummary;
  issues: ValidationIssue[];
  tools: ToolValidationResult[];
  metadata: ValidationMetadata;
}

interface ValidationSummary {
  totalTools: number;
  validTools: number;
  issuesByCategory: Record<IssueCategory, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
}

interface ValidationIssue {
  id: string;                    // Unique rule ID (e.g., "SEC-001")
  category: IssueCategory;
  severity: IssueSeverity;
  message: string;
  tool: string;                  // Tool name
  path?: string;                 // JSON path to problematic field
  suggestion?: string;           // Fix recommendation
  documentation?: string;        // Link to relevant docs
}

type IssueCategory =
  | 'schema'           // JSON Schema compliance
  | 'security'         // Security vulnerabilities
  | 'llm-compatibility' // LLM understanding issues
  | 'naming'           // Naming convention violations
  | 'best-practice';   // Recommended improvements

type IssueSeverity = 'error' | 'warning' | 'suggestion';

interface ValidationMetadata {
  validatorVersion: string;
  mcpSpecVersion: string;       // Always "2025-11-25"
  timestamp: string;
  duration: number;             // Milliseconds
  configUsed: string;           // Path to config file if any
  llmAnalysisUsed: boolean;
}
```

### Configuration

```typescript
interface ValidatorConfig {
  rules: RuleConfig;
  output: OutputConfig;
  llm?: LLMConfig;
}

interface RuleConfig {
  // Each rule can be: true (enabled), false (disabled), or severity override
  [ruleId: string]: boolean | IssueSeverity;
}

interface OutputConfig {
  format: 'human' | 'json' | 'sarif';
  verbose: boolean;
  color: boolean;
}

interface LLMConfig {
  enabled: boolean;
  provider: 'openai' | 'anthropic' | 'ollama' | string;
  model: string;
  apiKey?: string;              // Or use env var
  baseUrl?: string;             // For custom endpoints
  timeout: number;
}
```

---

## Validation Rules

### Schema Validation (SCH-*)

| ID | Severity | Description |
|----|----------|-------------|
| SCH-001 | error | Tool must have a `name` field |
| SCH-002 | error | Tool must have a `description` field |
| SCH-003 | error | Tool must have an `inputSchema` field |
| SCH-004 | error | `inputSchema` must be valid JSON Schema |
| SCH-005 | error | `inputSchema.type` must be "object" |
| SCH-006 | warning | `inputSchema.properties` should be defined (not empty object) |
| SCH-007 | warning | Required parameters should be listed in `inputSchema.required` |
| SCH-008 | error | Parameters in `required` must exist in `properties` |

### Naming Rules (NAM-*)

| ID | Severity | Description |
|----|----------|-------------|
| NAM-001 | error | Tool name must be non-empty |
| NAM-002 | error | Tool name must use kebab-case format |
| NAM-003 | warning | Tool name should be 3-50 characters |
| NAM-004 | warning | Tool name should not start with numbers |
| NAM-005 | warning | Tool name should use descriptive verbs (get, create, update, delete, list, search) |
| NAM-006 | warning | Parameter names should use consistent casing (camelCase recommended) |

### Security Rules (SEC-*)

| ID | Severity | Description |
|----|----------|-------------|
| SEC-001 | error | String parameters must have `maxLength` constraint |
| SEC-002 | error | Array parameters must have `maxItems` constraint |
| SEC-003 | warning | Number parameters should have `minimum`/`maximum` constraints |
| SEC-004 | error | File path parameters must use `pattern` for path validation |
| SEC-005 | error | URL parameters must use `format: "uri"` |
| SEC-006 | warning | Command/query parameters should use `enum` when values are known |
| SEC-007 | warning | Sensitive parameter names (password, token, key, secret) should be flagged |
| SEC-008 | error | No default values for security-sensitive parameters |
| SEC-009 | warning | Object parameters with `additionalProperties: true` need justification |
| SEC-010 | warning | Parameters accepting code/scripts should be documented as dangerous |

### LLM Compatibility Rules (LLM-*)

| ID | Severity | Description |
|----|----------|-------------|
| LLM-001 | error | Tool description must be non-empty |
| LLM-002 | warning | Tool description should be 20-500 characters |
| LLM-003 | warning | Tool description should explain WHAT the tool does |
| LLM-004 | warning | Tool description should explain WHEN to use the tool |
| LLM-005 | suggestion | Tool description should include example usage |
| LLM-006 | error | Each parameter must have a `description` |
| LLM-007 | warning | Parameter descriptions should be 10-200 characters |
| LLM-008 | warning | Avoid ambiguous terms (e.g., "data", "value", "input") without context |
| LLM-009 | suggestion | Include parameter constraints in description (e.g., "max 100 characters") |
| LLM-010 | warning | Avoid jargon and abbreviations without explanation |
| LLM-011 | suggestion | Tool description should mention side effects if any |
| LLM-012 | warning | Related tools should have consistent description patterns |

### Best Practice Rules (BP-*)

| ID | Severity | Description |
|----|----------|-------------|
| BP-001 | suggestion | Consider adding `title` annotation for display purposes |
| BP-002 | suggestion | Consider adding `readOnlyHint` annotation |
| BP-003 | suggestion | Consider adding `destructiveHint` for data-modifying tools |
| BP-004 | suggestion | Consider adding `idempotentHint` annotation |
| BP-005 | warning | Tools with many parameters (>10) should be split |
| BP-006 | suggestion | Use `$ref` for repeated schema patterns |
| BP-007 | warning | Deeply nested schemas (>4 levels) hurt usability |
| BP-008 | suggestion | Provide `examples` in inputSchema for complex parameters |

---

## LLM-Assisted Analysis

When enabled, the validator uses an LLM to perform deeper analysis of tool descriptions that rule-based checks cannot catch.

### Analysis Dimensions

1. **Clarity Score** (1-10): How clear is the description for an AI to understand?
2. **Completeness Score** (1-10): Does it cover what, when, and how?
3. **Ambiguity Detection**: Identify vague phrases that could cause misuse
4. **Conflict Detection**: Find contradictions between description and schema
5. **Improvement Suggestions**: Specific rewrites for problematic descriptions

### LLM Prompt Template

```
You are evaluating MCP tool definitions for LLM compatibility.

Tool Definition:
- Name: {name}
- Description: {description}
- Parameters: {parameters}

Evaluate this tool definition and respond with JSON:
{
  "clarity_score": <1-10>,
  "completeness_score": <1-10>,
  "ambiguities": [<list of vague phrases>],
  "conflicts": [<list of description/schema mismatches>],
  "suggestions": [<list of specific improvements>]
}

Consider:
- Would an AI understand when to call this tool?
- Are there edge cases not addressed?
- Could the description lead to incorrect usage?
```

### Provider Configuration

```yaml
llm:
  enabled: true
  provider: anthropic
  model: claude-3-haiku-20240307
  timeout: 30000
  # API key via ANTHROPIC_API_KEY env var
```

Supported providers:
- `openai`: GPT-4, GPT-3.5-turbo
- `anthropic`: Claude 3 family
- `ollama`: Local models (llama2, mistral, etc.)
- Custom: Any OpenAI-compatible API via `baseUrl`

---

## Input Sources

### Static File Validation

Supports JSON and YAML files containing:

**Single Tool Definition**
```json
{
  "name": "get-user",
  "description": "Retrieves user by ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" }
    },
    "required": ["userId"]
  }
}
```

**Tool Array**
```json
{
  "tools": [
    { "name": "get-user", ... },
    { "name": "create-user", ... }
  ]
}
```

**MCP Server Manifest (partial)**
```yaml
name: my-server
tools:
  - name: get-user
    description: ...
```

### Live Server Validation

Connect to running MCP servers via:

**STDIO Transport**
```bash
mcp-validate --server "node server.js"
```

**HTTP Transport**
```bash
mcp-validate --server "http://localhost:3000/mcp"
```

The validator:
1. Establishes MCP connection
2. Sends `initialize` request
3. Calls `tools/list` to retrieve definitions
4. Validates retrieved tools
5. Closes connection

On connection failure: immediately fail with error (no partial results).

---

## API Reference

### Library API

```typescript
import { validate, validateFile, validateServer } from 'mcp-tool-validator';

// Validate tool definitions directly
const result = await validate(toolDefinitions, options);

// Validate from file
const result = await validateFile('tools.json', options);

// Validate from live server
const result = await validateServer('http://localhost:3000/mcp', options);

// Options
interface ValidateOptions {
  config?: ValidatorConfig;      // Override default config
  configPath?: string;           // Load config from file
  format?: 'result' | 'json' | 'sarif';  // Return format
}
```

### CLI Interface

```bash
# Validate file
mcp-validate tools.json

# Validate live server
mcp-validate --server http://localhost:3000/mcp
mcp-validate --server "node server.js"

# Output formats
mcp-validate tools.json --format json
mcp-validate tools.json --format sarif

# Configuration
mcp-validate tools.json --config mcp-validate.config.yaml
mcp-validate tools.json --rule SEC-001=off
mcp-validate tools.json --rule LLM-005=error

# LLM analysis
mcp-validate tools.json --llm
mcp-validate tools.json --llm --llm-provider anthropic

# Verbosity
mcp-validate tools.json --verbose
mcp-validate tools.json --quiet  # Only errors

# CI mode (exit code based on errors)
mcp-validate tools.json --ci
```

### HTTP Service

```bash
# Start service
mcp-validate serve --port 8080
```

**Endpoints**

`POST /validate`
```json
{
  "tools": [...],
  "config": { ... }
}
```

Response:
```json
{
  "valid": false,
  "summary": { ... },
  "issues": [ ... ],
  "tools": [ ... ],
  "metadata": { ... }
}
```

`GET /health`
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## Output Formats

### Human-Readable (Default)

```
MCP Tool Validator v1.0.0
─────────────────────────────────────────────────

Validating: tools.json (5 tools)

✗ get-user
  ERROR [SEC-001] String parameter 'userId' missing maxLength constraint
    at: inputSchema.properties.userId
    suggestion: Add "maxLength": 100 or appropriate limit

  WARNING [LLM-002] Description too short (15 chars, recommend 20-500)
    suggestion: Expand description to explain when to use this tool

✓ create-user
  SUGGESTION [BP-003] Consider adding destructiveHint annotation

✓ delete-user

─────────────────────────────────────────────────
Summary: 3/5 tools valid

  Errors:    2
  Warnings:  3
  Suggestions: 5

  By Category:
    schema:          1
    security:        2
    llm-compatibility: 3
    best-practice:   4

Validation failed with 2 errors.
```

### JSON Output

```json
{
  "valid": false,
  "summary": {
    "totalTools": 5,
    "validTools": 3,
    "issuesByCategory": {
      "schema": 1,
      "security": 2,
      "llm-compatibility": 3,
      "best-practice": 4
    },
    "issuesBySeverity": {
      "error": 2,
      "warning": 3,
      "suggestion": 5
    }
  },
  "issues": [
    {
      "id": "SEC-001",
      "category": "security",
      "severity": "error",
      "message": "String parameter 'userId' missing maxLength constraint",
      "tool": "get-user",
      "path": "inputSchema.properties.userId",
      "suggestion": "Add \"maxLength\": 100 or appropriate limit",
      "documentation": "https://docs.example.com/rules/SEC-001"
    }
  ],
  "tools": [...],
  "metadata": {
    "validatorVersion": "1.0.0",
    "mcpSpecVersion": "2025-11-25",
    "timestamp": "2025-01-07T12:00:00Z",
    "duration": 145,
    "configUsed": "mcp-validate.config.yaml",
    "llmAnalysisUsed": false
  }
}
```

### SARIF Output

Standard SARIF 2.1.0 format for integration with VS Code, GitHub Code Scanning, and other tools.

---

## Configuration File

Default location: `mcp-validate.config.yaml` in current directory.

```yaml
# mcp-validate.config.yaml

rules:
  # Disable specific rules
  BP-001: false
  BP-002: false

  # Change severity
  LLM-005: error      # Promote suggestion to error
  SEC-003: suggestion # Demote warning to suggestion

  # Everything else uses default severity

output:
  format: human       # human | json | sarif
  verbose: false
  color: true

llm:
  enabled: false
  provider: anthropic
  model: claude-3-haiku-20240307
  timeout: 30000
  # apiKey: via ANTHROPIC_API_KEY env var
  # baseUrl: for custom endpoints
```

---

## Error Handling

### Input Errors

| Error | Description | Exit Code |
|-------|-------------|-----------|
| `FILE_NOT_FOUND` | Input file does not exist | 2 |
| `PARSE_ERROR` | Invalid JSON/YAML syntax | 2 |
| `INVALID_FORMAT` | File content not valid tool definitions | 2 |

### Server Connection Errors

| Error | Description | Exit Code |
|-------|-------------|-----------|
| `CONNECTION_FAILED` | Cannot connect to MCP server | 3 |
| `PROTOCOL_ERROR` | Server does not speak MCP | 3 |
| `TIMEOUT` | Server did not respond in time | 3 |

On server connection failure: immediately return error, no partial validation.

### Validation Errors

| Exit Code | Meaning |
|-----------|---------|
| 0 | All validations passed |
| 1 | Validation completed with errors |

---

## Testing Strategy

### Unit Tests

- Rule logic tests (each rule in isolation)
- Parser tests (JSON, YAML, various formats)
- Reporter tests (output formatting)
- Config loader tests

### Integration Tests

- End-to-end CLI tests
- HTTP service tests
- Live server validation tests (mock MCP server)

### Fixtures

Maintain test fixtures for:
- Valid tool definitions (golden files)
- Invalid definitions triggering each rule
- Edge cases (empty, malformed, large)

---

## Project Structure

```
mcp-tool-validator/
├── src/
│   ├── index.ts              # Library entry point
│   ├── cli/
│   │   ├── index.ts          # CLI entry point
│   │   ├── commands/
│   │   │   ├── validate.ts
│   │   │   └── serve.ts
│   │   └── output/
│   │       ├── human.ts
│   │       ├── json.ts
│   │       └── sarif.ts
│   ├── core/
│   │   ├── validator.ts      # Main validation orchestrator
│   │   ├── rule-engine.ts    # Rule execution
│   │   └── config.ts         # Configuration management
│   ├── parsers/
│   │   ├── file-parser.ts    # JSON/YAML parsing
│   │   └── mcp-client.ts     # Live server connection
│   ├── rules/
│   │   ├── index.ts          # Rule registry
│   │   ├── schema/           # SCH-* rules
│   │   ├── naming/           # NAM-* rules
│   │   ├── security/         # SEC-* rules
│   │   ├── llm/              # LLM-* rules
│   │   └── best-practice/    # BP-* rules
│   ├── llm/
│   │   ├── analyzer.ts       # LLM analysis orchestrator
│   │   └── providers/
│   │       ├── openai.ts
│   │       ├── anthropic.ts
│   │       └── ollama.ts
│   ├── service/
│   │   └── server.ts         # HTTP service
│   └── types/
│       └── index.ts          # Type definitions
├── bin/
│   └── mcp-validate.ts       # CLI binary entry
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
├── package.json
├── tsconfig.json
└── mcp-validate.config.yaml  # Default config
```

---

## Dependencies

### Runtime

- `ajv` - JSON Schema validation
- `yaml` - YAML parsing
- `commander` - CLI framework
- `chalk` - Terminal colors
- `@modelcontextprotocol/sdk` - MCP client for live server validation
- `openai` / `@anthropic-ai/sdk` - LLM provider SDKs (optional)

### Development

- `typescript`
- `vitest` - Testing
- `eslint` + `prettier`
- `tsup` - Build/bundle

---

## Open Questions

1. **Schema version pinning**: Should we embed the MCP 2025-11-25 JSON Schema or fetch dynamically?
   - *Recommendation*: Embed for offline use, with option to update

2. **Rule documentation**: Where should detailed rule documentation live?
   - *Recommendation*: Markdown files in `docs/rules/`, linked from issue output

3. **LLM cost management**: Should we cache LLM analysis results?
   - *Recommendation*: Optional content-hash-based caching

---

## Future Considerations

(Not in scope for initial implementation, but design should accommodate)

- Custom rule plugins
- Category-specific validation profiles
- Comparison/diff between validation runs
- GitHub Action for automated PR checks
- VS Code extension for inline validation

---

## References

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
- [MCP Tools Documentation](https://modelcontextprotocol.info/docs/concepts/tools/)
- [JSON Schema Specification](https://json-schema.org/specification)
- [SARIF Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
