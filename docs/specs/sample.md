### Best Practices for MCP Tool Definitions and Descriptions
Effective MCP tool definitions prioritize clarity, precision, and LLM-friendly design to ensure accurate selection and invocation. Key practices drawn from the official specification and community guides include:

- **Keep descriptions concise (1-2 sentences)** — Structure as "[Verb] a [resource]" (e.g., "Create a new channel" or "Update shared drive settings including name, color, and restrictions").
- **Front-load critical information** — Place the core action and any prerequisites/limitations first, as LLMs may truncate longer text.
- **Explicitly include workflow guidance** — Mention required preceding steps, scope, or alternatives (e.g., "Call discover_required_fields('Contact') first to identify mandatory fields" or "No user filtering; use search_calls_extensive instead").
- **Clarify scope and limitations** — Specify what the tool does/does not do (e.g., "Get a single comment by ID" or "List ALL calls in date range").
- **Use clear, unambiguous naming** — For the tool (e.g., namespaced like `asana_search`) and parameters (e.g., `user_id` instead of `user`).
- **Describe parameters thoroughly in the inputSchema** — Use JSON Schema with detailed `description` fields for each parameter, including types, examples, and constraints; move operational details (e.g., authentication, pagination) here rather than the top-level description.
- **Provide outputSchema when possible** — Define expected output structure for better validation and parsing.
- **Consolidate related functionality** — Avoid one-tool-per-API-endpoint; combine operations into high-impact tools.
- **Optimize for context efficiency** — Return relevant, concise outputs; support modes like "concise" vs. "detailed".
- **Test iteratively with evaluations** — Use realistic tasks, agent loops, and metrics (e.g., success rate) to refine based on misuse patterns.
- **Handle errors helpfully** — Return clear messages with correction suggestions.

### What Makes Tool Definitions Easier for LLMs to Understand
LLMs rely on textual cues in descriptions and schemas to decide *when* and *how* to call tools, often in competitive selection among many options. Factors that improve understanding and reduce errors include:

- **Brevity and structure** → Short, verb-resource formats allow quick parsing and matching to user intent.
- **Explicitness** → Spelling out prerequisites, limitations, and relationships prevents hallucinated usage or failed calls.
- **Front-loading and precision** → Critical details early avoid truncation issues; unambiguous terms reduce ambiguity in argument generation.
- **Schema richness** → Detailed parameter descriptions guide correct argument formatting; output schemas help LLMs anticipate and parse results.
- **Workflow awareness** → Guidance on sequencing or alternatives enables multi-step reasoning.
- **Evaluation-driven refinement** → Tools tested in real agent flows exhibit higher "hit rates" as descriptions align with common LLM reasoning patterns.

Poor descriptions (e.g., vague, buried details, or overloaded with metadata) lead to overuse, misuse, or avoidance of the tool.

### Codifying Validations as Rules for Scoring MCP Tool Maturity
To assess maturity, we can define a scoring system (0-100 points) with weighted rules across categories. Each rule is a binary or partial check (e.g., 0/5/10 points). Higher scores indicate tools that are more reliable, secure, and effective for LLM agents. This is a proposed framework inspired by best practices—no official model exists yet.

| Category                  | Rule                                                                 | Points | Rationale/Validation Check |
|---------------------------|----------------------------------------------------------------------|--------|----------------------------|
| **Description Quality** (40 points) | Concise (1-2 sentences) and structured (verb + resource)            | 10     | Count sentences; check for imperative verb. |
|                           | Front-loads action, prerequisites, and limitations                  | 10     | Key info in first sentence? |
|                           | Includes workflow guidance (e.g., prerequisites, alternatives)      | 10     | Mentions other tools or steps? |
|                           | Clear scope/limitations without ambiguity                           | 10     | Explicitly states what it does/doesn't do. |
| **Parameter & Schema Quality** (30 points) | Unambiguous parameter names and detailed descriptions in inputSchema | 10     | All params have clear names + descriptions. |
|                           | Required fields marked; examples/constraints provided               | 10     | Uses JSON Schema features effectively. |
|                           | outputSchema provided and well-defined                              | 10     | Optional but boosts parsability. |
| **Tool Design & Usability** (20 points) | Consolidated functionality (not one-per-endpoint)                   | 10     | Handles multiple related ops? |
|                           | Namespaced or uniquely named to avoid conflicts                      | 5      | Prefixes if in a suite. |
|                           | Supports context efficiency (e.g., concise modes, pagination)       | 5      | Response handling noted. |
| **Testing & Reliability** (10 points) | Evidence of evaluation/testing (e.g., noted in docs or error handling) | 10     | Helpful errors; implies iteration. |

**Maturity Levels**:
- **0-40: Immature** → High risk of misuse; basic functionality only.
- **41-70: Moderate** → Usable in simple agents; some guidance.
- **71-90: Mature** → Reliable for complex workflows.
- **91-100: Exemplary** → Optimized for advanced multi-tool agents.

This scoring can be automated via linting tools or manual review, encouraging iterative improvement through agent evaluations.