# MCP Tool Validator - Implementation Chunks

**Spec**: `docs/specs/validator.md`
**Architecture**: `docs/architecture/validator.md`
**Created**: 2025-01-07
**Approach**: Horizontal (layer by layer)
**Beads**: Integrated (use /auto to implement)

## Progress

- [ ] Phase 1: Foundation (2 chunks)
- [ ] Phase 2: Input Layer (2 chunks)
- [ ] Phase 3: Rule System (6 chunks)
- [ ] Phase 4: Output Layer (1 chunk)
- [ ] Phase 5: Integration Layer (3 chunks)
- [ ] Phase 6: Optional Enhancement (1 chunk)

---

## Phase 1: Foundation

### [ ] CHUNK-01: Types & Data Models
**Goal**: All TypeScript types and interfaces defined, project initialized with tsconfig and package.json
**Scope**:
- `src/types/index.ts` - ToolDefinition, ToolSource, ToolAnnotations, ValidationResult, ValidationSummary, ValidationIssue, IssueCategory, IssueSeverity, ValidationMetadata, ValidatorConfig, RuleConfig, OutputConfig, LLMConfig
- `package.json` - Project setup with all dependencies from architecture doc
- `tsconfig.json` - TypeScript configuration for ESM
- `tsup.config.ts` - Build configuration
**Size**: L
**Risk**: None
**Beads**: #bqk

### [ ] CHUNK-02: Configuration System
**Goal**: Cosmiconfig-based config loading working, default config file in place
**Scope**:
- `src/core/config.ts` - loadConfig(), mergeConfig(), default values
- `mcp-validate.config.yaml` - Default configuration file
**Size**: M
**Risk**: None
**Beads**: #ng5

---

## Phase 2: Input Layer

### [ ] CHUNK-03: File Parser
**Goal**: Can parse JSON/YAML tool definitions in all supported formats (single tool, array, manifest)
**Scope**:
- `src/parsers/file.ts` - parseFile(), detectFormat(), normalizeToToolDefinitions()
- `tests/fixtures/` - Sample valid/invalid tool definition files
**Size**: L
**Risk**: None
**Beads**: #0z8

### [ ] CHUNK-04: MCP Client
**Goal**: Can connect to live MCP servers (STDIO and HTTP transport), retrieve tool definitions
**Scope**:
- `src/parsers/mcp-client.ts` - connectToServer(), getToolDefinitions(), disconnect()
**Size**: L
**Risk**: MCP SDK integration - first external dependency usage
**Beads**: #byr

---

## Phase 3: Rule System

### [ ] CHUNK-05: Rule Engine & Registry
**Goal**: Rule loading, execution, and aggregation working; rule interface defined
**Scope**:
- `src/rules/types.ts` - Rule interface, RuleContext
- `src/core/rule-loader.ts` - loadRules(), dynamic imports
- `src/core/rule-engine.ts` - executeRules(), aggregateResults()
**Size**: L
**Risk**: None
**Beads**: #2kj

### [ ] CHUNK-06: Schema Rules (SCH-*)
**Goal**: All 8 schema validation rules implemented with tests
**Scope**:
- `src/rules/schema/sch-001.ts` through `sch-008.ts`
- `tests/unit/rules/schema/` - Rule tests
**Size**: L
**Risk**: None
**Beads**: #1ye

### [ ] CHUNK-07: Naming Rules (NAM-*)
**Goal**: All 6 naming convention rules implemented with tests
**Scope**:
- `src/rules/naming/nam-001.ts` through `nam-006.ts`
- `tests/unit/rules/naming/` - Rule tests
**Size**: L
**Risk**: None
**Beads**: #ass

### [ ] CHUNK-08: Security Rules (SEC-*)
**Goal**: All 10 security validation rules implemented with tests
**Scope**:
- `src/rules/security/sec-001.ts` through `sec-010.ts`
- `tests/unit/rules/security/` - Rule tests
**Size**: L
**Risk**: None
**Beads**: #1xi

### [ ] CHUNK-09: LLM Compatibility Rules (LLM-*)
**Goal**: All 12 LLM compatibility rules implemented with tests
**Scope**:
- `src/rules/llm/llm-001.ts` through `llm-012.ts`
- `tests/unit/rules/llm/` - Rule tests
**Size**: L
**Risk**: None
**Beads**: #54w

### [ ] CHUNK-10: Best Practice Rules (BP-*)
**Goal**: All 8 best practice rules implemented with tests
**Scope**:
- `src/rules/best-practice/bp-001.ts` through `bp-008.ts`
- `tests/unit/rules/best-practice/` - Rule tests
**Size**: L
**Risk**: None
**Beads**: #uju

---

## Phase 4: Output Layer

### [ ] CHUNK-11: Reporter System
**Goal**: Human, JSON, and SARIF reporters working with full formatting
**Scope**:
- `src/reporters/human.ts` - formatHumanOutput(), chalk colors
- `src/reporters/json.ts` - formatJsonOutput()
- `src/reporters/sarif.ts` - formatSarifOutput(), SARIF 2.1.0 compliance
**Size**: L
**Risk**: None
**Beads**: #67c

---

## Phase 5: Integration Layer

### [ ] CHUNK-12: Core Validator
**Goal**: Main validate() API working end-to-end, library exports complete
**Scope**:
- `src/core/validator.ts` - validate(), validateFile(), validateServer()
- `src/index.ts` - Library entry point and exports
**Size**: L
**Risk**: None
**Beads**: #i2g

### [ ] CHUNK-13: CLI Application
**Goal**: mcp-validate CLI working with all commands and options
**Scope**:
- `src/cli.ts` - Commander setup, validate command, serve command
- `bin/mcp-validate.js` - CLI binary shim
**Size**: L
**Risk**: None
**Beads**: #xe8

### [ ] CHUNK-14: HTTP Service
**Goal**: Hono server working with /validate and /health endpoints
**Scope**:
- `src/service/server.ts` - Hono app, POST /validate, GET /health
**Size**: M
**Risk**: None
**Beads**: #3wf

---

## Phase 6: Optional Enhancement

### [ ] CHUNK-15: LLM Analyzer
**Goal**: LLM-assisted analysis working with OpenAI, Anthropic, and Ollama providers
**Scope**:
- `src/llm/analyzer.ts` - analyzeTool(), LLM prompt template, result parsing
- Vercel AI SDK integration with all three providers
**Size**: L
**Risk**: LLM API integration - external service dependency, cost management
**Beads**: #sgn

---

## Discovered During Implementation

(To be updated as implementation progresses)

---

## Notes

### Horizontal Approach Rationale
Building layer by layer allows:
- Complete type safety from the start (all types defined first)
- All rules can be developed in parallel once rule engine exists
- Reporters can be developed independently of rules
- Core validator can integrate all pieces at the end

### Dependencies Summary
```
Phase 1 (Foundation) ─┬─► Phase 2 (Input)
                      ├─► Phase 3 (Rules)
                      └─► Phase 4 (Output)
                              │
                              ▼
                      Phase 5 (Integration)
                              │
                              ▼
                      Phase 6 (LLM - optional)
```

### Parallel Opportunities
- CHUNK-03 and CHUNK-04 can run in parallel (both depend only on types)
- CHUNK-06 through CHUNK-10 can all run in parallel (all depend only on rule engine)
- CHUNK-11 can run in parallel with rule chunks
- CHUNK-13 and CHUNK-14 can run in parallel (both depend on core validator)
