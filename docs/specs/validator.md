# MCP Tool Definition Validator Specification

## Overview

A governance validator for Model Context Protocol (MCP) tool definitions that ensures quality, security, and LLM-compatibility. The validator analyzes MCP tool definitions from both static files and live servers, producing comprehensive reports for developers, security teams, and MCP client applications.

### Goals

1. **Quality Assurance**: Ensure tool definitions follow the finalized MCP specification (2026-07-28) and best practices
2. **Security Validation**: Detect input validation gaps, scope issues, and data exposure risks
3. **LLM Compatibility**: Verify tool descriptions are clear, unambiguous, and optimized for LLM understanding
4. **CI/CD Integration**: Provide machine-readable output for automated validation pipelines

### Non-Goals

- Runtime tool execution monitoring
- MCP server implementation validation (beyond tool definitions)
- Custom plugin system for user-defined rules
- Category-specific validation rules (file system, database, etc.)
- Multi-version protocol support beyond 2026-07-28 and legacy 2025-11-25

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
  title?: string;
  description?: string;
  icons?: ToolIcon[];
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
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
  compliant?: boolean;
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
  issuesByProvenance?: Record<IssueProvenance, number>;
  maturityScore: number;
  maturityLevel: MaturityLevel;
}

interface ValidationIssue {
  id: string;                    // Unique rule ID (e.g., "SEC-001")
  category: IssueCategory;
  severity: IssueSeverity;
  provenance?: IssueProvenance;  // specification | governance | heuristic
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
type IssueProvenance = 'specification' | 'governance' | 'heuristic';

interface ValidationMetadata {
  validatorVersion: string;
  mcpSpecVersion: string;       // "2026-07-28" by default
  discoverySpecVersion?: string;
  validationProfile?: 'compliance' | 'governance';
  serverEndpoint?: string;
  authenticationScope?: 'none' | 'unknown';
  toolExecutionPerformed?: boolean;
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
  specVersion?: '2025-11-25' | '2026-07-28';
  discoverySpecVersion?: '2025-11-25' | '2026-07-28';
  profile?: 'compliance' | 'governance';
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

The implementation contains 57 rules across five categories. The complete
normative catalog, examples, version gates, and default severities live in
[RULES.md](../RULES.md).

| Category | IDs | Count | Default purpose |
|---|---|---:|---|
| Schema | SCH-001–SCH-011 | 11 | MCP tool shape, JSON Schema validity, finalized metadata and header constraints |
| Naming | NAM-002–NAM-008 | 7 | MCP name recommendations, uniqueness, consistency, and tool-set organization |
| Security | SEC-001–SEC-011 | 11 | Defensive bounds, sensitive inputs, URL/path controls, and header exposure |
| LLM compatibility | LLM-001–LLM-013 | 13 | Description and parameter clarity, side effects, consistency, and workflow guidance |
| Best practice | BP-001–BP-015 | 15 | Annotations, icons, output schemas, pagination, response controls, and overlap |

Every emitted issue is tagged `specification`, `governance`, or `heuristic`.
SCH-009, SCH-010, and SEC-011 run only when the validation target is
`2026-07-28`.

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
  model: claude-haiku-4-5
  timeout: 30000
  # API key via ANTHROPIC_API_KEY env var
```

Supported providers:
- `openai`: `@ai-sdk/openai` (default model `gpt-4o-mini`)
- `anthropic`: `@ai-sdk/anthropic` (default model `claude-haiku-4-5`)
- `ollama`: `ollama-ai-provider-v2` (default model `llama3.2`)

`baseUrl` can point a supported provider adapter at a compatible endpoint.

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
1. Resolves the discovery revision independently from the validation revision.
2. Uses stateless per-request metadata for `2026-07-28`, or the SDK
   initialization flow for explicit `2025-11-25` discovery.
3. Calls `tools/list`, follows pagination, and accepts JSON or SSE over HTTP.
4. Validates the returned definitions using `specVersion` and the selected
   profile.
5. Records endpoint, both revisions, authentication scope, and the fact that no
   tool was executed.

The client never silently downgrades. An unsupported modern revision produces
an actionable error suggesting an explicit legacy discovery retry.

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
  config?: ConfigOverrides;      // Partial validated overrides
  configPath?: string;           // Load/discover config file
  runContext?: {                 // Reproducibility metadata for live discovery
    serverEndpoint: string;
    discoverySpecVersion: MCPSpecVersion;
    authenticationScope: 'none' | 'unknown';
    toolExecutionPerformed: boolean;
  };
}
```

### CLI Interface

```bash
# Validate file
mcp-validate tools.json

# Validate live server
mcp-validate --server http://localhost:3000/mcp
mcp-validate --server "node server.js"

# Discover through a legacy server and validate with finalized rules
mcp-validate --server https://example.com/mcp \
  --discovery-spec-version 2025-11-25 \
  --spec-version 2026-07-28 \
  --profile compliance

# Output formats
mcp-validate tools.json --format json
mcp-validate tools.json --format sarif

# Configuration
mcp-validate tools.json --config mcp-validate.config.yaml
mcp-validate tools.json --rule SEC-001=off
mcp-validate tools.json --rule LLM-005=error
mcp-validate tools.json --profile governance

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
  "version": "0.1.0"
}
```

---

## Output Formats

### Human-Readable (Default)

```
MCP Tool Validator v0.1.0
─────────────────────────────────────────────────

Validating: 5 tool(s)
Profile: governance
Validation spec: 2026-07-28

✗ get-user
  ERROR [SEC-001] [GOVERNANCE] String parameter 'userId' is missing maxLength constraint
    at: inputSchema.properties.userId
    suggestion: Add "maxLength": 100 or appropriate limit

  WARNING [LLM-002] [HEURISTIC] Tool description is too short
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

MCP specification compliance passed.
Governance threshold failed with 2 error(s).
```

### JSON Output

```json
{
  "valid": false,
  "compliant": true,
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
    },
    "issuesByProvenance": {
      "specification": 0,
      "governance": 4,
      "heuristic": 6
    },
    "maturityScore": 88,
    "maturityLevel": "mature"
  },
  "issues": [
    {
      "id": "SEC-001",
      "category": "security",
      "severity": "error",
      "provenance": "governance",
      "message": "String parameter 'userId' missing maxLength constraint",
      "tool": "get-user",
      "path": "inputSchema.properties.userId",
      "suggestion": "Add \"maxLength\": 100 or appropriate limit",
      "documentation": "https://docs.example.com/rules/SEC-001"
    }
  ],
  "tools": [...],
  "metadata": {
    "validatorVersion": "0.1.0",
    "mcpSpecVersion": "2026-07-28",
    "validationProfile": "governance",
    "timestamp": "2026-08-05T12:00:00Z",
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

specVersion: "2026-07-28"
# discoverySpecVersion: "2025-11-25" # optional; inherits specVersion
profile: governance # governance | compliance

llm:
  enabled: false
  provider: anthropic
  model: claude-haiku-4-5
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
| `CONNECTION_FAILED` | Cannot connect to MCP server | 2 |
| `PROTOCOL_ERROR` | Server does not speak the selected MCP revision | 2 |
| `TIMEOUT` | Server did not respond in time | 2 |

On server connection failure: immediately return error, no partial validation.

### Validation Errors

| Exit Code | Meaning |
|-----------|---------|
| 0 | Validation completed; without `--ci`, findings do not change the exit code |
| 1 | `--ci` was supplied and the effective profile produced errors |
| 2 | Input, configuration, connection, or protocol failure |

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
- Modern JSON/SSE pagination and real stdio fixture tests
- Split discovery/validation revisions, profiles, provenance, and metadata

### Fixtures

Maintain test fixtures for:
- Valid tool definitions (golden files)
- Invalid definitions triggering each rule
- Edge cases (empty, malformed, large)

Current quality gate: 71 test files and 1,023 tests.

---

## Project Structure

```
mcp_tool_description_validator/
├── src/
│   ├── index.ts              # Library exports
│   ├── cli.ts                # Commander CLI and serve subcommand
│   ├── core/
│   │   ├── validator.ts      # Main validation orchestrator
│   │   ├── rule-engine.ts    # Rule execution
│   │   ├── rule-loader.ts    # Config/version rule selection
│   │   └── config.ts         # Validated configuration management
│   ├── parsers/
│   │   ├── file.ts           # JSON/YAML parsing
│   │   └── mcp-client.ts     # Modern native + legacy SDK discovery
│   ├── rules/
│   │   ├── index.ts          # Rule registry
│   │   ├── schema/           # SCH-* rules
│   │   ├── naming/           # NAM-* rules
│   │   ├── security/         # SEC-* rules
│   │   ├── llm-compatibility/# LLM-* rules
│   │   └── best-practice/    # BP-* rules
│   ├── llm/
│   │   └── analyzer.ts       # AI SDK analysis + provider adapters
│   ├── reporters/            # Human, JSON, and SARIF output
│   ├── service/
│   │   └── server.ts         # HTTP service
│   └── types/
│       └── index.ts          # Type definitions
├── bin/
│   └── mcp-validate.js       # CLI binary shim
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
- `@modelcontextprotocol/sdk` - explicit legacy MCP discovery
- `ai` - provider-independent LLM generation API
- `@ai-sdk/openai`, `@ai-sdk/anthropic`, or `ollama-ai-provider-v2` - optional peer adapter

### Development

- `typescript`
- `vitest` - Testing
- `tsup` - Build/bundle

---

## Live-server validation requirements

The 2026-08-05
[Google Drive MCP case study](../case-studies/google-drive.md) exposed the
following requirements. All six are implemented and covered by automated tests.

| ID | Status | Requirement | Acceptance criteria |
|---|---|---|---|
| LIVE-001 | Implemented | Decouple discovery and validation revisions | CLI, library, and configuration APIs can select a live-server discovery protocol independently from the rule-set `specVersion`; reports record both values |
| LIVE-002 | Implemented | Report finding provenance | Every finding is identifiable as MCP specification compliance, configurable governance policy, or heuristic advice; the overall report does not describe policy-only failures as MCP noncompliance |
| LIVE-003 | Implemented | Add context-aware security classification | Opaque identifiers such as `fileId` do not trigger path traversal rules without path evidence; pagination tokens are not automatically classified as credentials; documented structured query languages are not automatically treated as executable code |
| LIVE-004 | Implemented | Improve version diagnostics | An unsupported protocol response names the attempted revision and suggests an explicit compatible-revision retry; the validator never silently downgrades |
| LIVE-005 | Implemented | Support validation profiles | A base compliance profile and a strict governance profile can assign different severities to recommendations such as string bounds while preserving the underlying finding |
| LIVE-006 | Implemented | Capture reproducibility metadata | Real-server reports can record endpoint, timestamp, validator version, discovery revision, validation revision, authentication scope, tool count, and whether tool execution occurred |

These requirements preserve an important boundary: the validator assesses tool
definitions and discovery interoperability, not the correctness of remote tool
execution or the security of a server implementation.

---

## Current Boundaries and Follow-up

1. **Schema version pinning**: Behavior is pinned to the finalized MCP
   2026-07-28 schema and prose requirements; adding a revision requires an
   explicit code and test update.

2. **Rule documentation**: The maintained catalog lives in
   [`docs/RULES.md`](../RULES.md).

3. **LLM cost management**: Analysis currently runs sequentially without a
   result cache. Optional content-hash caching remains future work.

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

- [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices)
- [MCP Tools Documentation](https://modelcontextprotocol.info/docs/concepts/tools/)
- [JSON Schema Specification](https://json-schema.org/specification)
- [SARIF Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)
