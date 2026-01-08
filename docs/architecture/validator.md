# MCP Tool Validator Architecture

**Date**: 2025-01-07
**Spec**: [docs/specs/validator.md](../specs/validator.md)

## Tech Stack

| Layer | Choice | Health | Rationale |
|-------|--------|--------|-----------|
| Runtime | Node.js 20+ | Active | LTS, ESM native |
| Language | TypeScript 5.x | Active | Type safety, MCP SDK compatibility |
| JSON Schema | Ajv 8.x | 170M/week | Fastest, most compliant, ESLint uses it |
| CLI | Commander 14.x | 198M/week | Zero deps, simple API, battle-tested |
| HTTP | Hono 4.x | 1.5M/week | Lightweight, fast, modern |
| Config | Cosmiconfig 9.x | Active | Standard config loading, YAML/JSON/JS |
| Testing | Vitest 4.x | 1.5M/week | Zero-config TS, 30-70% faster than Jest |
| Build | tsup 8.x | Active | Zero-config, esbuild-based, fast |
| MCP Client | @modelcontextprotocol/sdk 1.x | Official | Stable, spec 2025-11-25 support |
| LLM | Vercel AI SDK 6.x | Active | Unified API for OpenAI/Anthropic/Ollama |

## Decisions

### 1. Hono over Fastify for HTTP Service

**Choice**: Hono
**Why**: Lighter footprint for a simple stateless validation API. We only need 2 endpoints (`POST /validate`, `GET /health`). Hono's minimal overhead suits this better than Fastify's full feature set.
**Rejected**: Fastify (overkill for 2 endpoints), Express (slower, dated)

### 2. Config-Driven Rule Loading

**Choice**: Rules loaded dynamically based on configuration
**Why**: Enables tree-shaking unused rules in library mode, cleaner separation between rule definitions and execution, supports future lazy loading for performance.
**Rejected**: Static imports (loads all rules always), Registry pattern (more complex for no clear benefit)

### 3. Vercel AI SDK for LLM Abstraction

**Choice**: Vercel AI SDK (`ai` package)
**Why**: Single unified API for OpenAI, Anthropic, and Ollama. Active maintenance, streaming support, good TypeScript types. Avoids writing our own abstraction layer.
**Rejected**: Direct SDK imports (more code to maintain), LangChain (too heavy for our needs)

### 4. MCP SDK v1.x

**Choice**: @modelcontextprotocol/sdk v1.x stable branch
**Why**: Production-ready, supports MCP spec 2025-11-25. v2 is pre-alpha until Q1 2026.
**Monitor**: Upgrade to v2 when stable release ships

### 5. Single Package Distribution

**Choice**: Publish as single npm package with CLI binary and library exports
**Why**: Simpler versioning, easier installation. CLI via `npx mcp-validate` or global install, library via `import { validate } from 'mcp-tool-validator'`.
**Rejected**: Monorepo with separate packages (unnecessary complexity for this scope)

## Components

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
│ file-parser │   │ schema/*    │        │ human.ts    │
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
const RULE_MODULES = {
  'SEC-001': () => import('../rules/security/sec-001'),
  'SEC-002': () => import('../rules/security/sec-002'),
  // ...
};

export async function loadRules(config: RuleConfig): Promise<Rule[]> {
  const enabledRules = Object.entries(config)
    .filter(([_, value]) => value !== false)
    .map(([id]) => id);

  return Promise.all(
    enabledRules.map(async id => {
      const module = await RULE_MODULES[id]();
      return module.default;
    })
  );
}
```

## File Structure

```
mcp-tool-validator/
├── src/
│   ├── index.ts                 # Library exports
│   ├── cli.ts                   # CLI entry (commander)
│   ├── core/
│   │   ├── validator.ts         # Main orchestrator
│   │   ├── rule-loader.ts       # Dynamic rule loading
│   │   └── config.ts            # Cosmiconfig wrapper
│   ├── parsers/
│   │   ├── file.ts              # JSON/YAML parsing
│   │   └── mcp-client.ts        # MCP SDK client wrapper
│   ├── rules/
│   │   ├── types.ts             # Rule interface
│   │   ├── schema/
│   │   │   ├── sch-001.ts
│   │   │   └── ...
│   │   ├── naming/
│   │   ├── security/
│   │   ├── llm/
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
  "ajv": "^8.17.0",
  "ajv-formats": "^3.0.0",
  "commander": "^14.0.0",
  "cosmiconfig": "^9.0.0",
  "chalk": "^5.0.0",
  "hono": "^4.0.0",
  "yaml": "^2.0.0",
  "@modelcontextprotocol/sdk": "^1.0.0",
  "ai": "^6.0.0",
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
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "ollama-ai-provider": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "@ai-sdk/openai": { "optional": true },
    "@ai-sdk/anthropic": { "optional": true },
    "ollama-ai-provider": { "optional": true }
  }
}
```

## Monitor

| Library | Concern | Check By |
|---------|---------|----------|
| @modelcontextprotocol/sdk | v2 release | Q1 2026 |
| Hono | Maturity vs Fastify | Q2 2026 |
| Vercel AI SDK | Breaking changes in v7 | As released |

## Open Questions

Resolved from spec:

1. **Schema version pinning**: Embed MCP 2025-11-25 JSON Schema for offline use
2. **Rule documentation**: Markdown in `docs/rules/`, linked from issue output
3. **LLM cost management**: Content-hash-based caching (optional)

## References

- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [Commander.js](https://github.com/tj/commander.js)
- [Hono](https://hono.dev/)
- [Cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)
- [Vitest](https://vitest.dev/)
- [tsup](https://github.com/egoist/tsup)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Vercel AI SDK](https://sdk.vercel.ai/)
