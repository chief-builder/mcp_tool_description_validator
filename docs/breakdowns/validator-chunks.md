# MCP Tool Validator Implementation Status

**Original plan:** 2026-01-07

**Updated:** 2026-10-02

**Specification:** [validator.md](../specs/validator.md)

**Architecture:** [validator.md](../architecture/validator.md)

The original horizontal implementation plan is complete. This file now records
the delivered capability map rather than presenting completed work as pending.

## Delivered layers

- [x] Foundation: ESM TypeScript package, public types, configuration, build,
  and Vitest infrastructure.
- [x] Input layer: JSON/YAML normalization plus live HTTP and stdio MCP
  discovery.
- [x] Rule system: 57 registry-selected rules across schema, naming, security,
  LLM compatibility, and best-practice categories.
- [x] Output layer: human, JSON, and SARIF 2.1.0 reporters.
- [x] Integration layer: CLI, programmatic library, and Hono HTTP service.
- [x] Optional LLM analysis: OpenAI, Anthropic, and Ollama provider support via
  optional peer dependencies.

## Current cross-cutting behavior

- Current (latest) MCP `2026-07-28` validation with explicit legacy `2025-11-25`
  support.
- Independent discovery and validation revisions.
- `governance` and `compliance` profiles.
- Finding provenance: `specification`, `governance`, and `heuristic`.
- Separate `valid` and `compliant` result signals.
- Per-tool averaged maturity scoring.
- Live-run reproducibility metadata and no tool execution.
- Resource-bounded JSON Schema traversal and safe network `$ref` handling.
- Configuration validation and precedence shared by CLI, library, and HTTP API.

## Dependency flow

```text
types + config
      ├── file parser
      ├── version-aware MCP client
      ├── rule loader + engine + profiles
      └── reporters
               └── core validator
                       ├── CLI
                       ├── library exports
                       ├── HTTP service
                       └── optional LLM analysis
```

## Current verification

- 73 test files / 1,086 tests, with enforced coverage thresholds
- Build and declaration generation
- Source and test type checking, ESLint, and Prettier
- Real-server proof against Google Drive MCP (see the
  [case study](../case-studies/google-drive.md))

Future work should be tracked in the specification or a dedicated roadmap, not
by reopening this completed implementation plan.
