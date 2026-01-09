# Best Practices for MCP Tool Definitions and Descriptions

This document outlines best practices for creating effective MCP (Model Context Protocol) tool definitions. These practices form the foundation for the MCP Tool Description Validator's 46 validation rules.

## Core Principles

Effective MCP tool definitions prioritize clarity, precision, and LLM-friendly design to ensure accurate selection and invocation. Key practices drawn from the official specification and community guides include:

- **Keep descriptions concise (1-2 sentences)** - Structure as "[Verb] a [resource]" (e.g., "Create a new channel" or "Update shared drive settings including name, color, and restrictions").
- **Front-load critical information** - Place the core action and any prerequisites/limitations first, as LLMs may truncate longer text.
- **Explicitly include workflow guidance** - Mention required preceding steps, scope, or alternatives (e.g., "Call discover_required_fields('Contact') first to identify mandatory fields" or "No user filtering; use search_calls_extensive instead").
- **Clarify scope and limitations** - Specify what the tool does/does not do (e.g., "Get a single comment by ID" or "List ALL calls in date range").
- **Use clear, unambiguous naming** - For the tool (e.g., namespaced like `asana_search`) and parameters (e.g., `user_id` instead of `user`).
- **Describe parameters thoroughly in the inputSchema** - Use JSON Schema with detailed `description` fields for each parameter, including types, examples, and constraints; move operational details (e.g., authentication, pagination) here rather than the top-level description.
- **Provide outputSchema when possible** - Define expected output structure for better validation and parsing.
- **Consolidate related functionality** - Avoid one-tool-per-API-endpoint; combine operations into high-impact tools.
- **Optimize for context efficiency** - Return relevant, concise outputs; support modes like "concise" vs. "detailed".
- **Test iteratively with evaluations** - Use realistic tasks, agent loops, and metrics (e.g., success rate) to refine based on misuse patterns.
- **Handle errors helpfully** - Return clear messages with correction suggestions.

## What Makes Tool Definitions Easier for LLMs to Understand

LLMs rely on textual cues in descriptions and schemas to decide *when* and *how* to call tools, often in competitive selection among many options. Factors that improve understanding and reduce errors include:

- **Brevity and structure** - Short, verb-resource formats allow quick parsing and matching to user intent.
- **Explicitness** - Spelling out prerequisites, limitations, and relationships prevents hallucinated usage or failed calls.
- **Front-loading and precision** - Critical details early avoid truncation issues; unambiguous terms reduce ambiguity in argument generation.
- **Schema richness** - Detailed parameter descriptions guide correct argument formatting; output schemas help LLMs anticipate and parse results.
- **Workflow awareness** - Guidance on sequencing or alternatives enables multi-step reasoning.
- **Evaluation-driven refinement** - Tools tested in real agent flows exhibit higher "hit rates" as descriptions align with common LLM reasoning patterns.

Poor descriptions (e.g., vague, buried details, or overloaded with metadata) lead to overuse, misuse, or avoidance of the tool.

## Maturity Scoring Framework

The validator uses a scoring system (0-100 points) with weighted rules across categories. Higher scores indicate tools that are more reliable, secure, and effective for LLM agents.

### Scoring Categories

| Category | Focus Areas | Weight |
|----------|-------------|--------|
| **Description Quality** | Concise structure, front-loaded info, workflow guidance, clear scope | 40% |
| **Parameter & Schema Quality** | Clear names, detailed descriptions, required fields, outputSchema | 30% |
| **Tool Design & Usability** | Consolidated functionality, unique naming, context efficiency | 20% |
| **Testing & Reliability** | Error handling, evaluation evidence | 10% |

### Maturity Levels

| Score | Level | Description |
|-------|-------|-------------|
| **0-40** | Immature | High risk of misuse; basic functionality only |
| **41-70** | Moderate | Usable in simple agents; some guidance |
| **71-90** | Mature | Reliable for complex workflows |
| **91-100** | Exemplary | Optimized for advanced multi-tool agents |

### Rule Severity Impact

Each rule violation impacts the score differently based on severity:

| Severity | Impact | Examples |
|----------|--------|----------|
| `error` | High deduction | Missing required fields, security vulnerabilities |
| `warning` | Moderate deduction | Suboptimal descriptions, missing constraints |
| `suggestion` | Low deduction | Missing annotations, style recommendations |

## Validation Rule Categories

The validator implements 46 rules across 5 categories:

1. **Schema Validation (SCH-001 to SCH-008)**: MCP protocol compliance
2. **Naming Conventions (NAM-001 to NAM-006)**: Consistent, descriptive naming
3. **Security Constraints (SEC-001 to SEC-010)**: Input validation and security
4. **LLM Compatibility (LLM-001 to LLM-013)**: LLM understanding optimization
5. **Best Practices (BP-001 to BP-009)**: MCP annotations and usability

See [RULES.md](../RULES.md) for the complete rule reference.