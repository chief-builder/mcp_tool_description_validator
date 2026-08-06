# MCP Tool Validator Architecture

**Updated**: 2026-08-05
**Spec**: [docs/specs/validator.md](../specs/validator.md)

## Tech Stack

| Layer | Choice | Health | Rationale |
|-------|--------|--------|-----------|
| Runtime | Node.js 20+ | Active | LTS, ESM native |
| Language | TypeScript 5.x | Active | Type safety, MCP SDK compatibility |
| JSON Schema | Ajv 8.x | Active | JSON Schema 2020-12 validation |
| CLI | Commander 14.x | Active | Small, typed command surface |
| HTTP | Hono 4.x | Active | Lightweight validation service |
| Config | Cosmiconfig 9.x | Active | Standard config loading, YAML/JSON/JS |
| Testing | Vitest 4.x | Active | Fast TypeScript unit and integration tests |
| Build | tsup 8.x | Active | Zero-config, esbuild-based, fast |
| MCP Client | Native 2026 transport + @modelcontextprotocol/sdk 1.30+ | Active | Finalized stateless protocol plus legacy compatibility |
| LLM | Vercel AI SDK 6.x | Active | Unified API for OpenAI/Anthropic/Ollama |

## Decisions

### 1. Hono over Fastify for HTTP Service

**Choice**: Hono
**Why**: Lighter footprint for a simple stateless validation API. We only need 2 endpoints (`POST /validate`, `GET /health`). Hono's minimal overhead suits this better than Fastify's full feature set.
**Rejected**: Fastify (overkill for 2 endpoints), Express (slower, dated)

### 2. Registry-Based, Config-Driven Rule Selection

**Choice**: Rules are statically registered, then filtered by configuration and
target specification revision before execution.
**Why**: The registry keeps rule discovery deterministic while still supporting
enable/disable settings, severity overrides, and revision-gated rules.

### 3. Vercel AI SDK for LLM Abstraction

**Choice**: Vercel AI SDK (`ai` package)
**Why**: Single unified API for OpenAI, Anthropic, and Ollama. Active maintenance, streaming support, good TypeScript types. Avoids writing our own abstraction layer.
**Rejected**: Direct SDK imports (more code to maintain), LangChain (too heavy for our needs)

### 4. Version-aware MCP client

**Choice**: Native stateless HTTP/stdio requests for 2026-07-28, with @modelcontextprotocol/sdk v1.30+ retained for explicit 2025-11-25 compatibility
**Why**: The stable SDK client still initializes using the legacy protocol flow. The finalized revision removes initialization and requires protocol metadata on every request, so the validator uses a small version-pinned transport path for modern live-server discovery.

### 5. Single Package Distribution

**Choice**: Publish as single npm package with CLI binary and library exports
**Why**: Simpler versioning, easier installation. CLI via `npx mcp-validate` or global install, library via `import { validate } from 'mcp-tool-validator'`.
**Rejected**: Monorepo with separate packages (unnecessary complexity for this scope)

### 6. Separate discovery from validation policy

**Choice**: `discoverySpecVersion` controls live-server interoperability while
`specVersion` controls rule loading. `profile` independently controls effective
policy severity.
**Why**: A server can expose valid definitions through an older protocol
revision. Coupling transport negotiation to rule targeting prevented finalized
validation of Google's Drive MCP endpoint.

### 7. Provenance-aware results

**Choice**: Every runtime finding is labeled `specification`, `governance`, or
`heuristic`; reports expose both `compliant` and `valid`.
**Why**: Strict defensive policy and name/text heuristics must not be presented
as MCP specification failures.

## Components

### Runtime flow

```mermaid
flowchart TB
  subgraph Entry points
    CLI[CLI]
    LIB[Library API]
    HTTP[HTTP service]
  end
  subgraph Boundary checks
    INPUT[Parse / normalize tools]
    CONFIG[Validate / normalize configuration]
  end
  subgraph Validation engine
    LOAD[Load enabled rules]
    EXEC[Execute rules per tool]
    SCORE[Aggregate findings and score]
  end
  PROFILE[Compliance / governance profile]
  PROVENANCE[Specification / governance / heuristic]
  OUTPUT[Human / JSON / SARIF result]

  CLI --> INPUT
  LIB --> INPUT
  HTTP --> INPUT
  CLI --> CONFIG
  LIB --> CONFIG
  HTTP --> CONFIG
  INPUT --> EXEC
  CONFIG --> LOAD --> EXEC --> SCORE --> OUTPUT
  PROFILE --> EXEC
  EXEC --> PROVENANCE --> SCORE
```

The boundary-check layer is deliberately shared: configuration files and HTTP
request overrides use the same schema and alias normalization. This keeps rule
execution limited to `true`, `false`, or a supported severity override.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Entry Points                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   CLI           │   Library       │    HTTP Service             │
│   commander     │   validate()    │    Hono                     │
└────────┬────────┴────────┬────────┴─────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Core Validator                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    validate()                            │    │
│  │  - Load config (cosmiconfig)                            │    │
│  │  - Parse input (file or MCP server)                     │    │
│  │  - Run enabled rules                                    │    │
│  │  - Aggregate results                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
         │                 │                      │
         ▼                 ▼                      ▼
┌─────────────┐   ┌─────────────┐        ┌─────────────┐
│   Parsers   │   │    Rules    │        │  Reporters  │
├─────────────┤   ├─────────────┤        ├─────────────┤
│ file.ts     │   │ schema/*    │        │ human.ts    │
│ mcp-client  │   │ naming/*    │        │ json.ts     │
│             │   │ security/*  │        │ sarif.ts    │
│             │   │ llm/*       │        │             │
│             │   │ best-prac/* │        │             │
└─────────────┘   └─────────────┘        └─────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   LLM Analyzer      │
              │   (Vercel AI SDK)   │
              │   - Optional        │
              │   - Provider-agnostic│
              └─────────────────────┘
```

## Data Flow

```
Input                    Processing                    Output
─────                    ──────────                    ──────

JSON/YAML file  ──┐
                  ├──▶  Parse  ──▶  Normalize  ──▶  Validate  ──▶  Report
MCP Server URL  ──┘              (ToolDefinition[])    │              │
                                                       │              │
                                                       ▼              ▼
                                              Config-driven      Format-specific
                                              rule execution     output (human/
                                              + optional LLM     json/sarif)
```

## Rule Architecture

### Rule Definition

Each rule is a self-contained module:

```typescript
// src/rules/security/sec-001.ts
import type { Rule, RuleContext } from '../types';

export const SEC_001: Rule = {
  id: 'SEC-001',
  category: 'security',
  defaultSeverity: 'error',
  description: 'String parameters must have maxLength constraint',

  check(tool: ToolDefinition, ctx: RuleContext): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    // ... validation logic
    return issues;
  }
};
```

### Config-Driven Loading

Rules are loaded based on configuration:

```typescript
// src/core/rule-loader.ts
export async function loadRules(
  config: RuleConfig,
  specVersion = '2026-07-28'
): Promise<Rule[]> {
  return Object.values(RULES).filter((rule) => {
    if (config[rule.id] === false) return false;
    return !rule.specVersions || rule.specVersions.includes(specVersion);
  });
}
```

## File Structure

```
mcp_tool_description_validator/
├── src/
│   ├── index.ts                 # Library exports
│   ├── cli.ts                   # CLI entry (commander)
│   ├── core/
│   │   ├── validator.ts         # Main orchestrator
│   │   ├── rule-engine.ts       # Rule execution and aggregation
│   │   ├── rule-loader.ts       # Config/version rule selection
│   │   └── config.ts            # Cosmiconfig wrapper
│   ├── parsers/
│   │   ├── file.ts              # JSON/YAML parsing
│   │   └── mcp-client.ts        # Native 2026 + SDK-backed legacy discovery
│   ├── rules/
│   │   ├── types.ts             # Rule interface
│   │   ├── schema/
│   │   │   ├── sch-001.ts
│   │   │   └── ...
│   │   ├── naming/
│   │   ├── security/
│   │   ├── llm-compatibility/
│   │   └── best-practice/
│   ├── reporters/
│   │   ├── human.ts
│   │   ├── json.ts
│   │   └── sarif.ts
│   ├── llm/
│   │   └── analyzer.ts          # Vercel AI SDK integration
│   ├── service/
│   │   └── server.ts            # Hono HTTP server
│   └── types/
│       └── index.ts
├── bin/
│   └── mcp-validate.js          # CLI binary shim
├── tests/
│   ├── unit/
│   │   └── rules/               # One test file per rule
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Package Exports

```json
{
  "name": "mcp-tool-validator",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "bin": {
    "mcp-validate": "./bin/mcp-validate.js"
  }
}
```

## Dependencies

### Production

```json
{
  "@hono/node-server": "^2.0.8",
  "@modelcontextprotocol/sdk": "^1.30.0",
  "ai": "^6.0.0",
  "ajv": "^8.17.0",
  "ajv-formats": "^3.0.0",
  "commander": "^14.0.0",
  "cosmiconfig": "^9.0.0",
  "chalk": "^5.0.0",
  "hono": "^4.0.0",
  "yaml": "^2.0.0",
  "zod": "^4.0.0"
}
```

### Development

```json
{
  "typescript": "^5.4.0",
  "tsup": "^8.0.0",
  "vitest": "^4.0.0",
  "@types/node": "^20.0.0"
}
```

### Optional Peer Dependencies

LLM provider SDKs (only needed if using LLM analysis):

```json
{
  "peerDependencies": {
    "@ai-sdk/openai": "^3.0.0",
    "@ai-sdk/anthropic": "^3.0.0",
    "ollama-ai-provider-v2": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "@ai-sdk/openai": { "optional": true },
    "@ai-sdk/anthropic": { "optional": true },
    "ollama-ai-provider-v2": { "optional": true }
  }
}
```

## Monitor

| Library | Concern | Check By |
|---------|---------|----------|
| @modelcontextprotocol/sdk | Modern-protocol and future major-version changes | As released |
| Live interoperability | Run version-split discovery checks against managed and reference servers | Before protocol-target changes |
| Heuristic precision | Re-run real-server case studies and regression fixtures | With rule changes |
| Vercel AI SDK | Breaking changes in v7 | As released |

## Current Boundaries and Follow-up

1. **Schema version pinning**: Keep validation behavior pinned to the finalized MCP 2026-07-28 schema and prose requirements
2. **Rule documentation**: Consolidated in `docs/RULES.md`, linked from issue output
3. **LLM cost management**: Content-hash-based caching remains optional future work

## References

- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [Commander.js](https://github.com/tj/commander.js)
- [Hono](https://hono.dev/)
- [Cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- [Vitest](https://vitest.dev/)
- [tsup](https://github.com/egoist/tsup)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel AI SDK](https://sdk.vercel.ai/)
