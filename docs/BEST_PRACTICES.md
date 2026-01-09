# MCP Tool Definition Best Practices

This document outlines best practices for creating effective MCP (Model Context Protocol) tool definitions. These practices form the foundation for the MCP Tool Description Validator's 46 validation rules.

## Core Principles

Effective MCP tool definitions prioritize clarity, precision, and LLM-friendly design to ensure accurate selection and invocation.

### Description Quality

- **Keep descriptions concise (1-2 sentences)** - Structure as "[Verb] a [resource]" (e.g., "Create a new channel" or "Update shared drive settings including name, color, and restrictions").
- **Front-load critical information** - Place the core action and any prerequisites/limitations first, as LLMs may truncate longer text.
- **Explicitly include workflow guidance** - Mention required preceding steps, scope, or alternatives (e.g., "Call discover_required_fields('Contact') first to identify mandatory fields").
- **Clarify scope and limitations** - Specify what the tool does/does not do (e.g., "Get a single comment by ID" or "List ALL calls in date range").

### Parameter & Schema Quality

- **Use clear, unambiguous naming** - For the tool (e.g., namespaced like `asana-search`) and parameters (e.g., `userId` instead of `user`).
- **Describe parameters thoroughly** - Use JSON Schema with detailed `description` fields for each parameter, including types, examples, and constraints.
- **Provide outputSchema when possible** - Define expected output structure for better validation and parsing.

### Tool Design & Usability

- **Consolidate related functionality** - Avoid one-tool-per-API-endpoint; combine operations into high-impact tools.
- **Optimize for context efficiency** - Return relevant, concise outputs; support modes like "concise" vs. "detailed".
- **Handle errors helpfully** - Return clear messages with correction suggestions.

## What Makes Tool Definitions Easier for LLMs

LLMs rely on textual cues in descriptions and schemas to decide *when* and *how* to call tools. Factors that improve understanding:

| Factor | Benefit |
|--------|---------|
| **Brevity and structure** | Short, verb-resource formats allow quick parsing and matching to user intent |
| **Explicitness** | Spelling out prerequisites and limitations prevents hallucinated usage |
| **Front-loading** | Critical details early avoid truncation issues |
| **Schema richness** | Detailed parameter descriptions guide correct argument formatting |
| **Workflow awareness** | Guidance on sequencing enables multi-step reasoning |

Poor descriptions (vague, buried details, or overloaded with metadata) lead to overuse, misuse, or avoidance of the tool.

---

## Maturity Scoring Framework

The validator calculates a maturity score (0-100) based on rule compliance. Higher scores indicate tools that are more reliable, secure, and effective for LLM agents.

### Per-Tool Averaged Scoring

The server maturity score is the **average of individual tool scores**. This ensures fair comparison regardless of tool count:

1. Each tool starts at 100 points
2. Deduct points per issue severity
3. Floor each tool score at 0
4. **Server Score** = Average of all tool scores

### Scoring Impact by Severity

| Severity | Points Deducted | Examples |
|----------|-----------------|----------|
| `error` | -5 per issue | Missing required fields, security vulnerabilities |
| `warning` | -2 per issue | Suboptimal descriptions, missing constraints |
| `suggestion` | -1 per issue | Missing annotations, style recommendations |

### Maturity Levels

| Score | Level | Description |
|-------|-------|-------------|
| **91-100** | Exemplary | Optimized for advanced multi-tool agents |
| **71-90** | Mature | Reliable for complex workflows |
| **41-70** | Moderate | Usable in simple agents; some guidance |
| **0-40** | Immature | High risk of misuse; basic functionality only |

---

## Validation Rule Categories

The validator implements 46 rules organized into 5 categories:

### 1. Schema Validation (SCH-001 to SCH-008)

Ensures MCP protocol compliance and valid JSON Schema structure.

- Tool must have name, description, and inputSchema
- inputSchema must be valid JSON Schema with type "object"
- Required parameters must be listed in the required array

### 2. Naming Conventions (NAM-001 to NAM-006)

Ensures consistent, descriptive naming patterns.

- Tool names: kebab-case (e.g., `get-user`, `create-document`)
- Parameter names: camelCase (e.g., `userId`, `fileName`)
- Descriptive verbs: get, create, update, delete, list, search, etc.

### 3. Security Constraints (SEC-001 to SEC-010)

Identifies potential vulnerabilities in input handling.

- String parameters must have `maxLength`
- Array parameters must have `maxItems`
- File paths must have validation patterns
- Sensitive parameters should not have default values

### 4. LLM Compatibility (LLM-001 to LLM-013)

Optimizes tool definitions for LLM understanding.

- Descriptions should be 20-500 characters
- Descriptions should explain WHAT and WHEN to use the tool
- Parameters must have descriptions
- Avoid ambiguous terms without context
- Include workflow guidance for complex tools

### 5. Best Practices (BP-001 to BP-009)

Follows MCP annotations and usability guidelines.

- Include title, readOnlyHint, destructiveHint, idempotentHint annotations
- Limit parameter count (max 10)
- Limit nesting depth (max 4 levels)
- Provide outputSchema for response validation

---

## Alignment with Sample Spec

This framework is inspired by community best practices for MCP tool definitions:

| Sample Spec Recommendation | Validator Implementation |
|---------------------------|-------------------------|
| Concise descriptions (1-2 sentences) | LLM-002: 20-500 character length |
| Front-load critical information | LLM-003, LLM-004: WHAT and WHEN checks |
| Workflow guidance | LLM-013: Detects workflow patterns |
| Unambiguous parameter names | NAM-006: camelCase enforcement |
| Detailed parameter descriptions | LLM-006, LLM-007: Description requirements |
| outputSchema when possible | BP-009: outputSchema validation |
| Security constraints | SEC-*: 10 security rules |

See [RULES.md](RULES.md) for the complete rule reference with examples.
