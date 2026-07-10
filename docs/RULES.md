# MCP Tool Description Validator Rules Reference

This document provides a comprehensive reference for all 56 validation rules implemented in the MCP Tool Description Validator. Rules are organized by category and include descriptions, rationale, severity levels, and examples.

## Table of Contents

- [Rule Categories](#rule-categories)
- [Severity Levels](#severity-levels)
- [Schema Validation (SCH)](#schema-validation-sch)
- [Naming Conventions (NAM)](#naming-conventions-nam)
- [Security Constraints (SEC)](#security-constraints-sec)
- [LLM Compatibility (LLM)](#llm-compatibility-llm)
- [Best Practices (BP)](#best-practices-bp)
- [Alignment with Best Practices](#alignment-with-best-practices)

---

## Rule Categories

| Category | Prefix | Count | Focus |
|----------|--------|-------|-------|
| Schema Validation | SCH | 10 | MCP protocol compliance and JSON Schema validity |
| Naming Conventions | NAM | 7 | Consistent, descriptive tool and parameter naming |
| Security Constraints | SEC | 11 | Input validation and security best practices |
| LLM Compatibility | LLM | 13 | Optimizing tool definitions for LLM understanding |
| Best Practices | BP | 15 | MCP annotations, schema design, and usability |

Three rules validate features that only exist in the **draft** MCP specification: SCH-009, SCH-010, and SEC-011. They are skipped by default and only run when the draft spec is selected via `--spec-version draft` on the CLI or `specVersion: "draft"` in the config file.

---

## Severity Levels

| Severity | Description |
|----------|-------------|
| `error` | Critical issues that will likely cause failures or security vulnerabilities |
| `warning` | Important issues that may cause problems or degrade quality |
| `suggestion` | Recommendations for improvement that are not strictly required |

---

## Schema Validation (SCH)

Schema validation rules ensure tool definitions comply with the MCP specification and JSON Schema standards.

### SCH-001: Tool must have a name field

**Severity:** error

Validates that every tool definition includes a non-empty name field.

**Good Example:**
```json
{
  "name": "get-user-profile",
  "description": "Retrieves a user profile by ID"
}
```

**Bad Example:**
```json
{
  "description": "Retrieves a user profile by ID"
}
```

---

### SCH-002: Tool must have a description field

**Severity:** error

Validates that every tool definition includes a non-empty description field.

**Good Example:**
```json
{
  "name": "get-user",
  "description": "Retrieves user information by ID. Use this when you need to fetch user details."
}
```

**Bad Example:**
```json
{
  "name": "get-user",
  "description": ""
}
```

---

### SCH-003: Tool must have an inputSchema field

**Severity:** error

Validates that every tool definition includes an inputSchema field defining its parameters.

**Good Example:**
```json
{
  "name": "search-users",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    }
  }
}
```

**Bad Example:**
```json
{
  "name": "search-users",
  "description": "Searches for users"
}
```

---

### SCH-004: inputSchema must be valid JSON Schema

**Severity:** error

Validates that the inputSchema field is a valid JSON Schema document that can be compiled. Per the MCP spec, schemas are validated against JSON Schema 2020-12 by default (when no `$schema` field is present). A schema may explicitly declare draft-07 via `$schema` (e.g., `"http://json-schema.org/draft-07/schema#"`) and is then validated against that dialect. Any other declared dialect is reported as unsupported.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "count": { "type": "integer", "minimum": 0 }
    }
  }
}
```

**Bad Example:**
```json
{
  "inputSchema": {
    "type": "invalid-type",
    "properties": "not-an-object"
  }
}
```

---

### SCH-005: inputSchema.type must be "object"

**Severity:** error

Validates that the inputSchema has `type: "object"` as required by MCP. Tool inputs must be objects to support named parameters.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

**Bad Example:**
```json
{
  "inputSchema": {
    "type": "array"
  }
}
```

---

### SCH-006: inputSchema.properties should be defined

**Severity:** warning

Warns when a tool's inputSchema has no properties defined, which typically indicates a tool that takes no parameters.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" }
    }
  }
}
```

**Acceptable (documented):**
```json
{
  "name": "get-server-status",
  "description": "Gets current server status. Takes no parameters.",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

---

### SCH-007: Required parameters should be listed in inputSchema.required

**Severity:** warning

Warns when a tool has properties defined but no `required` array, suggesting the developer should explicitly declare which parameters are required vs optional.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" },
      "includeDetails": { "type": "boolean" }
    },
    "required": ["userId"]
  }
}
```

**Bad Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" }
    }
  }
}
```

---

### SCH-008: Parameters in required must exist in properties

**Severity:** error

Validates that every parameter name listed in the `required` array corresponds to a property defined in `properties`.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" }
    },
    "required": ["userId"]
  }
}
```

**Bad Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" }
    },
    "required": ["userId", "nonExistentParam"]
  }
}
```

---

### SCH-009: $ref must not resolve to a network URI

**Severity:** error
**Spec version:** draft only (requires `--spec-version draft` or `specVersion: "draft"` in config)

The draft MCP spec says implementations MUST NOT automatically dereference `$ref` values that resolve to network URIs (`http://`, `https://`, or protocol-relative `//`). Schemas relying on external network references would be rejected rather than silently treated as permissive. Local references are fine. Checked at any nesting depth.

**Good Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "address": { "$ref": "#/$defs/address" }
    },
    "$defs": {
      "address": { "type": "string", "maxLength": 200 }
    }
  }
}
```

**Bad Example:**
```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "address": { "$ref": "https://example.com/schemas/address.json" }
    }
  }
}
```

---

### SCH-010: x-mcp-header values must satisfy the draft spec constraints

**Severity:** error
**Spec version:** draft only (requires `--spec-version draft` or `specVersion: "draft"` in config)

The draft MCP spec allows a property's schema to carry an `x-mcp-header` extension whose value becomes the name portion of an `Mcp-Param-{name}` HTTP header. Clients MUST reject tools with invalid values, so each value must:

- be a non-empty string
- match RFC 9110 field-name token syntax (no spaces, colons, or separators)
- contain no CR/LF or other control characters
- be case-insensitively unique among all `x-mcp-header` values in the inputSchema
- appear only on primitive-typed parameters: `string`, `integer`, or `boolean` (`number` is explicitly not permitted)

**Good Example:**
```json
{
  "region": {
    "type": "string",
    "x-mcp-header": "region",
    "description": "Deployment region"
  }
}
```

**Bad Example:**
```json
{
  "retryCount": {
    "type": "number",
    "x-mcp-header": "retry count"
  }
}
```

---

## Naming Conventions (NAM)

Naming rules ensure tool and parameter names are consistent, clear, and follow conventions. (Name presence itself is validated by SCH-001; NAM rules skip tools with empty names.)

### NAM-002: Tool name must match the MCP spec grammar

**Severity:** error

Validates that tool names follow the MCP specification's name grammar: 1-128 characters, using only letters, digits, underscores, dots, and hyphens (`[A-Za-z0-9_.-]`). Names are case-sensitive.

Casing style (kebab/snake/camel) is not part of the spec grammar and is intentionally not checked — `getUser`, `get_user`, `get-user`, and `admin.tools.list` are all valid.

**Good Example:**
```json
{ "name": "getUser" }
{ "name": "DATA_EXPORT_v2" }
{ "name": "admin.tools.list" }
{ "name": "get-user-profile" }
```

**Bad Example:**
```json
{ "name": "my tool" }
{ "name": "tool,name" }
{ "name": "a-name-longer-than-128-characters..." }
```

---

### NAM-003: Tool name should be 3-50 characters

**Severity:** warning

Validates that tool names are within a reasonable length range. Too short names lack descriptiveness, too long names are hard to use.

**Good Example:**
```json
{ "name": "get-user" }
{ "name": "search-documents-by-content" }
```

**Bad Example:**
```json
{ "name": "gu" }
{ "name": "search-and-retrieve-all-documents-matching-query-with-pagination-and-sorting" }
```

---

### NAM-004: Tool name should not start with numbers

**Severity:** warning

Validates that tool names start with a letter, not a number.

**Good Example:**
```json
{ "name": "get-user" }
```

**Bad Example:**
```json
{ "name": "2fa-verify" }
```

---

### NAM-005: Tool name should use descriptive verbs

**Severity:** warning

Validates that tool names start with an action verb that clearly indicates what the tool does. This improves discoverability and helps LLMs understand when to use the tool. The first word token of the name (kebab/snake/dot/camelCase aware) must exactly match a known verb — prefix matching is not used, so `settings-panel` is correctly flagged rather than passing via the `set` prefix.

**Good Example:**
```json
{ "name": "get-user" }
{ "name": "create-document" }
{ "name": "validate-input" }
{ "name": "search-records" }
```

**Bad Example:**
```json
{ "name": "user-profile" }
{ "name": "document-handler" }
```

---

### NAM-006: Parameter names should use consistent casing

**Severity:** warning

Validates that all parameter names in the tool's inputSchema use consistent casing. camelCase is recommended as it's the standard convention in JSON and JavaScript/TypeScript ecosystems.

**Good Example:**
```json
{
  "properties": {
    "userId": { "type": "string" },
    "includeDetails": { "type": "boolean" },
    "maxResults": { "type": "integer" }
  }
}
```

**Bad Example (mixed casing):**
```json
{
  "properties": {
    "userId": { "type": "string" },
    "include_details": { "type": "boolean" },
    "MaxResults": { "type": "integer" }
  }
}
```

---

### NAM-007: Tool names must be unique within a server

**Severity:** error

The MCP specification says tool names should be unique within a server (comparison is case-sensitive). Every second and subsequent occurrence of a duplicated name is reported as an error. Additionally, two names that differ only by letter case (e.g., `getUser` vs `getuser`) are reported as a warning — technically distinct per spec, but an invitation for confusion.

**Good Example:**
```json
[
  { "name": "get-user" },
  { "name": "delete-user" }
]
```

**Bad Example:**
```json
[
  { "name": "get-user" },
  { "name": "get-user" }
]
```

---

### NAM-008: Large tool sets should group related tools under common name prefixes

**Severity:** suggestion

When a server exposes many tools, grouping related tools under common prefixes (`service_resource_action`, e.g. `asana_projects_search`) helps agents pick the right tool and keeps names distinct when multiple servers are aggregated.

The heuristic is deliberately conservative: it only applies to servers with 10 or more tools, and only fires when the names show no grouping structure on either axis — fewer than 30% of tools share their first name token with another tool AND fewer than 30% share their last token (verb-suffixed families like `read_file`/`write_file` count as grouped). At most one finding is emitted per run, attached to the first tool.

**Good Example:**
```json
[
  { "name": "asana_projects_search" },
  { "name": "asana_projects_create" },
  { "name": "asana_tasks_create" }
]
```

**Bad Example (12 tools, no shared prefixes or suffixes):**
```json
[
  { "name": "search-projects" },
  { "name": "make-task" },
  { "name": "fetch-workspace" }
]
```

---

## Security Constraints (SEC)

Security rules help prevent common vulnerabilities and ensure safe input handling. All SEC rules check parameters in **nested schemas at any depth** — properties inside objects, array `items`, composition keywords (`anyOf`/`oneOf`/`allOf`), and `$defs` — not just top-level properties.

### SEC-001: String parameters must have maxLength constraint

**Severity:** error

Unbounded string inputs can lead to denial of service attacks and buffer overflow vulnerabilities. All string parameters should define a maximum length constraint.

**Exceptions:** Content fields that legitimately need large text (e.g., `content`, `message`, `prompt`, `body`, `text`, `code`, `query`).

**Good Example:**
```json
{
  "username": {
    "type": "string",
    "maxLength": 100,
    "description": "Username (max 100 characters)"
  }
}
```

**Bad Example:**
```json
{
  "username": {
    "type": "string",
    "description": "Username"
  }
}
```

---

### SEC-002: Array parameters must have maxItems constraint

**Severity:** error

Unbounded arrays can lead to memory exhaustion and denial of service attacks.

**Good Example:**
```json
{
  "tags": {
    "type": "array",
    "items": { "type": "string" },
    "maxItems": 50,
    "description": "Tags to apply (max 50)"
  }
}
```

**Bad Example:**
```json
{
  "tags": {
    "type": "array",
    "items": { "type": "string" }
  }
}
```

---

### SEC-003: Number parameters should have minimum/maximum constraints

**Severity:** warning

Unbounded numeric inputs can lead to integer overflow, resource exhaustion, or unexpected behavior.

**Good Example:**
```json
{
  "pageSize": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "description": "Results per page (1-100)"
  }
}
```

**Bad Example:**
```json
{
  "pageSize": {
    "type": "integer",
    "description": "Results per page"
  }
}
```

---

### SEC-004: File path parameters must use pattern for path validation

**Severity:** error

File path parameters without proper validation can lead to path traversal attacks and unauthorized file access.

A parameter counts as a file path only when one of its whole name tokens is path-like (`path`, `filepath`, `file`, `filename`, `dir`, `directory`, `folder`). Matching is token-aware, so names like `profile`, `direction`, or `redirect` are not flagged.

**Good Example:**
```json
{
  "filePath": {
    "type": "string",
    "pattern": "^[a-zA-Z0-9_\\-./]+$",
    "description": "File path (alphanumeric, dots, slashes, hyphens, underscores only)"
  }
}
```

**Bad Example:**
```json
{
  "filePath": {
    "type": "string",
    "description": "Path to the file"
  }
}
```

---

### SEC-005: URL parameters must use format: "uri"

**Severity:** error

URL parameters without proper format validation can lead to SSRF (Server-Side Request Forgery) attacks.

**Good Example:**
```json
{
  "webhookUrl": {
    "type": "string",
    "format": "uri",
    "description": "Webhook endpoint URL"
  }
}
```

**Bad Example:**
```json
{
  "webhookUrl": {
    "type": "string",
    "description": "Webhook endpoint URL"
  }
}
```

---

### SEC-006: Command/query parameters should use enum when values are known

**Severity:** warning

Parameters that represent commands, actions, or queries should use enum constraints when the set of valid values is known.

**Good Example:**
```json
{
  "action": {
    "type": "string",
    "enum": ["start", "stop", "restart"],
    "description": "Action to perform: start, stop, or restart"
  }
}
```

**Bad Example:**
```json
{
  "action": {
    "type": "string",
    "description": "Action to perform"
  }
}
```

---

### SEC-007: Sensitive parameter names should be flagged

**Severity:** warning

Parameters with names suggesting sensitive data (password, token, key, secret, auth, credential) are flagged for review to ensure proper security handling.

Sensitive terms are matched as whole tokens/phrases (camelCase and snake_case aware): `apiKey` and `api_key` are flagged, but `author` does not match `auth`.

**Note:** This is an awareness rule. It flags parameters that need special handling such as avoiding logging, using secure transmission, etc.

---

### SEC-008: No default values for security-sensitive parameters

**Severity:** error

Security-sensitive parameters (passwords, tokens, keys, secrets) should never have default values. Sensitivity uses the same token-aware matching as SEC-007, so `author` is not treated as sensitive.

**Bad Example:**
```json
{
  "apiKey": {
    "type": "string",
    "default": "sk-test-12345",
    "description": "API key for authentication"
  }
}
```

---

### SEC-009: Object parameters with additionalProperties: true need justification

**Severity:** warning

Objects that accept additional properties beyond those defined in the schema can be a security risk as they may allow injection of unexpected data. Object-typed parameters (at any depth) that set `additionalProperties: true` or omit it entirely are reported at warning severity.

The root inputSchema is also checked: when it declares properties but leaves `additionalProperties` open, a **suggestion**-severity finding recommends adding `"additionalProperties": false` at the root. (Omitting it at the root is near-universal in real servers, hence the lower severity; bare no-parameter schemas are covered by BP-011 instead.)

**Good Example:**
```json
{
  "config": {
    "type": "object",
    "properties": {
      "timeout": { "type": "integer" }
    },
    "additionalProperties": false
  }
}
```

**Bad Example:**
```json
{
  "config": {
    "type": "object",
    "properties": {
      "timeout": { "type": "integer" }
    }
  }
}
```

---

### SEC-010: Parameters accepting code/scripts should be documented as dangerous

**Severity:** warning

Parameters that accept executable code or scripts should clearly document the security implications.

**Good Example:**
```json
{
  "script": {
    "type": "string",
    "description": "JavaScript code to execute. WARNING: Executes with full permissions - only run trusted code."
  }
}
```

**Bad Example:**
```json
{
  "script": {
    "type": "string",
    "description": "JavaScript code to execute"
  }
}
```

---

### SEC-011: Sensitive parameters must not be exposed via x-mcp-header

**Severity:** error
**Spec version:** draft only (requires `--spec-version draft` or `specVersion: "draft"` in config)

The draft MCP spec's `x-mcp-header` extension maps a parameter to an `Mcp-Param-{name}` HTTP header. Header values are visible to network intermediaries (proxies, gateways, access logs), so sensitive parameters (passwords, API keys, tokens — same token-aware matching as SEC-007) must not carry an `x-mcp-header` mapping. Pass sensitive values in the request body instead.

**Good Example:**
```json
{
  "region": {
    "type": "string",
    "x-mcp-header": "region"
  },
  "apiKey": {
    "type": "string",
    "description": "API key, sent in the request body"
  }
}
```

**Bad Example:**
```json
{
  "apiKey": {
    "type": "string",
    "x-mcp-header": "api-key"
  }
}
```

---

## LLM Compatibility (LLM)

LLM compatibility rules optimize tool definitions for accurate selection and invocation by language models.

### LLM-001: Tool description must be non-empty

**Severity:** error

Every tool must have a meaningful description that helps LLMs understand the tool's purpose.

---

### LLM-002: Tool description should be 20-500 characters

**Severity:** warning

Descriptions should be neither too short (lacking detail) nor too long (overwhelming for LLM context).

**Good Example:**
```json
{
  "description": "Retrieves user profile information by ID. Use this when you need to fetch user details including name, email, and preferences."
}
```

**Bad Example (too short):**
```json
{ "description": "Gets user" }
```

**Bad Example (too long):**
A description exceeding 500 characters with excessive detail.

---

### LLM-003: Tool description should explain WHAT the tool does

**Severity:** warning

The description should contain action verbs that explain the tool's functionality.

**Good Example:**
```json
{
  "description": "Creates a new user account with the specified email and password."
}
```

**Bad Example:**
```json
{
  "description": "User account management endpoint."
}
```

---

### LLM-004: Tool description should explain WHEN to use the tool

**Severity:** warning

The description should contain conditional phrases that help the LLM understand when to select this tool. Only genuinely conditional phrasing counts ("when", "if you...", "useful for", "use this for", etc.), matched as whole words/phrases. Bare "to"/"for" and "use this to" (which restate WHAT, not WHEN) do not satisfy this rule.

**Good Example:**
```json
{
  "description": "Lists all users in a workspace. Use this when you need to enumerate members or search for specific users."
}
```

**Bad Example:**
```json
{
  "description": "Lists all users in a workspace."
}
```

---

### LLM-005: Tool description should include example usage

**Severity:** suggestion

Descriptions should include examples or illustrations to help the LLM understand how to use the tool. The rule recognizes example phrases ("example", "e.g.", "for instance", "such as", code blocks) as well as example-shaped content: `` `inline code` ``, `key="value"` pairs, and quoted sample values.

**Good Example:**
```json
{
  "description": "Searches for files by name pattern. Example: search-files pattern=\"*.json\" to find all JSON files."
}
```

---

### LLM-006: Each parameter must have a description

**Severity:** error

All parameters defined in inputSchema.properties must have descriptions to help the LLM understand their purpose.

**Good Example:**
```json
{
  "userId": {
    "type": "string",
    "description": "The unique identifier of the user to retrieve"
  }
}
```

**Bad Example:**
```json
{
  "userId": {
    "type": "string"
  }
}
```

---

### LLM-007: Parameter descriptions should be 10-200 characters

**Severity:** warning

Parameter descriptions should be concise but informative, neither too short nor too long.

---

### LLM-008: Avoid ambiguous terms without context

**Severity:** warning

Parameter names and descriptions should avoid generic terms like "data", "value", "input" without providing context. Matching is token-aware (finds `data` inside `user_data` or `payloadData`), and context can come from the parameter name, its description, or the tool name itself — e.g. `write_file`'s `content` parameter is considered clear.

**Good Example:**
```json
{
  "userData": {
    "type": "object",
    "description": "User profile data including name, email, and preferences"
  }
}
```

**Bad Example:**
```json
{
  "data": {
    "type": "object",
    "description": "The data to process"
  }
}
```

---

### LLM-009: Include parameter constraints in description

**Severity:** suggestion

When a parameter has schema constraints (minimum, maximum, minLength, maxLength, pattern, enum, format), those constraints should be mentioned in the description. Each constraint is matched against natural phrasings — e.g. "at least 5", "up to 100 characters", "one of: a, b, c", "ISO 8601" — so descriptions do not need to repeat schema keywords verbatim.

**Good Example:**
```json
{
  "pageSize": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "description": "Number of results per page (1-100)"
  }
}
```

**Bad Example:**
```json
{
  "pageSize": {
    "type": "integer",
    "minimum": 1,
    "maximum": 100,
    "description": "Number of results per page"
  }
}
```

---

### LLM-010: Avoid jargon and abbreviations without explanation

**Severity:** warning

Parameter names should avoid unexplained abbreviations and technical jargon. Abbreviations are detected as whole name tokens (camelCase aware, so `userId` yields `id`), and an abbreviation counts as explained only when a word from **its own** expansion appears in the name or description — `id` needs "identifier", `cfg` needs "configuration". Abbreviations that are their own expansion (e.g. `json`, `cpu`) are never flagged.

**Good Example:**
```json
{
  "userId": {
    "type": "string",
    "description": "The unique user identifier"
  }
}
```

**Bad Example:**
```json
{
  "uid": {
    "type": "string",
    "description": "The uid"
  }
}
```

---

### LLM-011: Tool description should mention side effects

**Severity:** suggestion

Tools with side effects (creating, deleting, modifying, sending data) should mention these effects in their description. Side-effect verbs are matched as whole tokens of the tool name, so `settings_list`, `news_reader`, or `address_book` are not mistaken for `set`/`new`/`add`. Additionally, tools annotated with `destructiveHint: true` must warn about their destructive nature in the description (e.g., "permanently deletes", "cannot be undone").

**Good Example:**
```json
{
  "name": "delete-user",
  "description": "Permanently deletes a user account and all associated data. This action cannot be undone."
}
```

**Bad Example:**
```json
{
  "name": "delete-user",
  "description": "Removes a user from the system."
}
```

---

### LLM-012: Related tools should have consistent description patterns

**Severity:** warning

Tools with similar names (same prefix) should use consistent description patterns for better LLM understanding.

**Good Example:**
```json
[
  { "name": "user-create", "description": "Creates a new user account..." },
  { "name": "user-update", "description": "Updates an existing user account..." },
  { "name": "user-delete", "description": "Deletes a user account..." }
]
```

**Bad Example:**
```json
[
  { "name": "user-create", "description": "Creates a new user account..." },
  { "name": "user-update", "description": "User modification endpoint" },
  { "name": "user-delete", "description": "This tool is for deleting..." }
]
```

---

### LLM-013: Tool description should include workflow guidance

**Severity:** suggestion

The description should contain guidance about prerequisites, alternatives, or sequencing to help the LLM understand how to use the tool in context. Satisfied by whole-word sequencing keywords ("first", "before", "after", "instead", "requires", ...), workflow phrases ("call X first", "use X for"), or a whole-word mention of another tool's name from the same server (names shorter than 4 characters are ignored so generic words like "run" or "get" in prose don't count).

**Good Example:**
```json
{
  "description": "Updates a record's fields. Call get-record first to retrieve current values before updating."
}
```

**Bad Example:**
```json
{
  "description": "Updates a record's fields."
}
```

---

## Best Practices (BP)

Best practice rules ensure tools follow MCP conventions and are designed for optimal usability.

### BP-001: Consider adding a title for display purposes

**Severity:** suggestion

Tools should have a human-readable display name. The spec-preferred location is the top-level `title` field; `annotations.title` is also accepted (top-level `title` takes precedence for display). The rule passes when either is present.

**Good Example (preferred):**
```json
{
  "name": "get-user-profile",
  "title": "Get User Profile"
}
```

**Also Accepted:**
```json
{
  "name": "get-user-profile",
  "annotations": {
    "title": "Get User Profile"
  }
}
```

---

### BP-002: Consider adding readOnlyHint annotation

**Severity:** suggestion

Tools should have a `readOnlyHint` annotation to indicate whether they modify state.

**Good Example:**
```json
{
  "name": "list-users",
  "annotations": {
    "readOnlyHint": true
  }
}
```

---

### BP-003: Consider adding destructiveHint for data-modifying tools

**Severity:** suggestion

Tools with names suggesting modification should have a `destructiveHint` annotation.

**Good Example:**
```json
{
  "name": "delete-account",
  "annotations": {
    "destructiveHint": true
  }
}
```

---

### BP-004: Consider adding idempotentHint annotation

**Severity:** suggestion

Tools should have an `idempotentHint` annotation to indicate whether they're safe to retry.

**Good Example:**
```json
{
  "name": "get-user",
  "annotations": {
    "idempotentHint": true
  }
}
```

---

### BP-005: Tools with many parameters (>10) should be split

**Severity:** warning

Tools with more than 10 parameters should be considered for splitting into multiple smaller, more focused tools.

---

### BP-006: Use $ref for repeated schema patterns

**Severity:** suggestion

When the same schema pattern appears in multiple tools, consider using `$ref` to define it once and reference it.

---

### BP-007: Deeply nested schemas (>4 levels) hurt usability

**Severity:** warning

Schemas with more than 4 levels of nesting should be flattened or broken into separate tools.

---

### BP-008: Provide examples in inputSchema for complex parameters

**Severity:** suggestion

Complex parameters (objects, arrays, union types) should have `examples` to help LLMs understand expected values.

**Good Example:**
```json
{
  "filters": {
    "type": "object",
    "properties": {
      "status": { "type": "string" },
      "createdAfter": { "type": "string", "format": "date" }
    },
    "examples": [
      { "status": "active", "createdAfter": "2024-01-01" }
    ]
  }
}
```

---

### BP-009: Consider providing outputSchema for better output validation

**Severity:** suggestion

Tools should provide an `outputSchema` when possible to define expected output structure. This improves output validation, LLM parsing of results, and client-side type safety.

**Good Example:**
```json
{
  "name": "get-user",
  "outputSchema": {
    "type": "object",
    "description": "User profile information",
    "properties": {
      "id": { "type": "string", "description": "Unique user identifier" },
      "name": { "type": "string", "description": "Display name" },
      "email": { "type": "string", "description": "Email address" }
    }
  }
}
```

---

### BP-010: Tool icons must be well-formed and use safe sources

**Severity:** warning (unsafe schemes escalate to error; MIME-type notes are suggestions)

The MCP spec allows an optional `icons` array on tools. Each entry must be an object with a string `src` that is an `https://` URL or a `data:` URI. Clients MUST reject unsafe schemes (`javascript:`, `file:`, `ftp:`, `ws:`, plain `http:`, local app schemes), so those are reported at **error** severity. Uncommon MIME types and `image/svg+xml` (script-execution risk; some clients refuse to render SVG) get **suggestion**-severity notes — clients are only required to support `image/png` and `image/jpeg`.

**Good Example:**
```json
{
  "name": "get-user",
  "icons": [
    { "src": "https://example.com/icon.png", "mimeType": "image/png" }
  ]
}
```

**Bad Example:**
```json
{
  "name": "get-user",
  "icons": [
    { "src": "javascript:alert(1)" }
  ]
}
```

---

### BP-011: Parameterless tools should reject unexpected arguments

**Severity:** suggestion

For tools that take no parameters, the MCP spec recommends `{ "type": "object", "additionalProperties": false }` so the schema explicitly accepts only empty objects. A bare `{ "type": "object" }` is valid but silently accepts any arguments. Applies only to tools with no properties (or an empty `properties` object).

**Good Example:**
```json
{
  "name": "get-server-status",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

**Bad Example:**
```json
{
  "name": "get-server-status",
  "inputSchema": {
    "type": "object"
  }
}
```

---

### BP-012: Creation tools returning a handle should document its lifetime

**Severity:** suggestion

Per non-normative MCP guidance, servers needing cross-call state should return an explicit handle from a creation tool and accept it on later calls — and the handle's retention policy/lifetime should be stated in the creation tool's description (e.g., "sessions expire after 24 hours of inactivity").

The heuristic is deliberately conservative: it fires only when a tool whose name starts with a creation verb (create/open/start/begin/init/new) clearly produces a handle-like value (`id`, `handle`, `token`, `session` — mentioned in its outputSchema or description) that a sibling tool consumes as a required, same-named input parameter, and the creating tool's description says nothing about lifetime, expiry, TTL, or retention.

**Good Example:**
```json
{
  "name": "create-session",
  "description": "Creates a session and returns a session_id. Sessions expire after 24 hours of inactivity."
}
```

**Bad Example:**
```json
{
  "name": "create-session",
  "description": "Creates a session and returns a session_id."
}
```

---

### BP-013: Collection tools should support pagination or filtering parameters

**Severity:** suggestion

Tools that return collections can blow up an agent's context window when nothing bounds the response. A tool counts as collection-returning when its name starts with a listing verb (list/search/query/find/browse) or its description uses a collection phrase ("returns a list", "returns all", ...). It passes when any input parameter name (at any depth) contains a pagination- or filtering-style token such as `limit`, `cursor`, `page`, `offset`, `filter`, `since`, or `until`.

**Good Example:**
```json
{
  "name": "list-users",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": { "type": "integer", "minimum": 1, "maximum": 100, "description": "Max results per page (1-100)" },
      "cursor": { "type": "string", "maxLength": 200, "description": "Opaque pagination cursor from the previous call" }
    }
  }
}
```

**Bad Example:**
```json
{
  "name": "list-users",
  "inputSchema": {
    "type": "object",
    "properties": {}
  }
}
```

---

### BP-014: Large-output tools should expose a response-format control parameter

**Severity:** suggestion

Tools whose responses can be verbose should let the agent choose how much detail to receive (e.g., a `response_format` enum of `"concise" | "detailed"` — Anthropic measured roughly a 3x token difference between the two). The rule fires when the description signals potentially large output (whole-word match on "full", "complete", "detailed", "everything", "entire", "history", "logs", "contents", "dump") and no input parameter name contains a format-control token (`format`, `verbosity`, `detail`, `concise`, `fields`, `include`).

**Good Example:**
```json
{
  "name": "get-call-history",
  "description": "Retrieves the full call history for a user.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "responseFormat": { "type": "string", "enum": ["concise", "detailed"], "description": "Level of detail: concise or detailed" }
    }
  }
}
```

**Bad Example:**
```json
{
  "name": "get-call-history",
  "description": "Retrieves the full call history for a user.",
  "inputSchema": { "type": "object", "properties": {} }
}
```

---

### BP-015: Tools with overlapping descriptions likely confuse agents

**Severity:** suggestion

Multiple tools with overlapping purposes make it hard for agents to pick the right one. Prefer consolidating them into a single workflow tool (e.g., `schedule_event` instead of `list_users` + `list_events` + `create_event` chains), or sharpen each description to say when to use which.

The heuristic is deliberately conservative: descriptions are normalized, stopwords dropped, and the remaining token sets compared. Two tools count as overlapping when Jaccard similarity is at least 0.75 (both with enough meaningful tokens), or one normalized description strictly contains the other (both with 8+ meaningful tokens). One finding is reported, on the later tool of the pair. Exact duplicate names are NAM-007's job and are excluded here.

**Bad Example:**
```json
[
  { "name": "search-users", "description": "Searches the workspace directory for user accounts matching a query." },
  { "name": "find-users", "description": "Searches the workspace directory for user accounts matching a query string." }
]
```

---

## Alignment with Best Practices

This validator was designed to align with best practices from the MCP specification and community guidelines. See [BEST_PRACTICES.md](BEST_PRACTICES.md) for the complete guide. Key recommendations include:

### Best Practice Coverage

| Recommendation | Validator Rules |
|---------------------------|-----------------|
| Keep descriptions concise (1-2 sentences) | LLM-002 |
| Structure as "[Verb] a [resource]" | LLM-003, NAM-005 |
| Front-load critical information | LLM-003, LLM-004 |
| Include workflow guidance | LLM-013 |
| Clarify scope and limitations | LLM-004, LLM-011 |
| Use clear, unambiguous naming | NAM-002, NAM-005, NAM-006 |
| Describe parameters thoroughly | LLM-006, LLM-007, LLM-008 |
| Provide outputSchema when possible | BP-009 |
| Use JSON Schema features effectively | SCH-004 through SCH-010 |
| Namespaced/unique naming | NAM-007, NAM-008 |
| Bound collection responses (pagination/filtering) | BP-013 |
| Control response verbosity | BP-014 |
| Avoid overlapping tools | BP-015 |
| Handle errors helpfully | (Implementation concern) |

### Extensions Beyond Sample Spec

The validator includes additional rules not explicitly covered in the sample spec but valuable for production use:

1. **Security Rules (SEC-001 through SEC-011)**: Input validation and security best practices
2. **MCP Annotations (BP-001 through BP-004)**: title, readOnlyHint, destructiveHint, idempotentHint
3. **Schema Complexity (BP-005 through BP-008)**: Parameter counts, nesting depth, schema reuse
4. **Abbreviation Detection (LLM-010)**: Flags unexplained technical jargon
5. **Consistency Checking (LLM-012)**: Ensures related tools have consistent patterns
6. **Agent-Design Rules (BP-010 through BP-015)**: Icon safety, parameterless tool shape, handle lifetimes, pagination, response-format control, and overlap detection
7. **Draft-Spec Rules (SCH-009, SCH-010, SEC-011)**: Network `$ref` ban and `x-mcp-header` validation, active only with `--spec-version draft`

### Maturity Scoring

The validator calculates a maturity score (0-100) based on rule violations:

| Score Range | Maturity Level | Description |
|-------------|----------------|-------------|
| 0-40 | Immature | High risk of misuse; basic functionality only |
| 41-70 | Moderate | Usable in simple agents; some guidance |
| 71-90 | Mature | Reliable for complex workflows |
| 91-100 | Exemplary | Optimized for advanced multi-tool agents |

Each rule violation deducts points from the score, with severity weighting:
- **Error**: Higher impact on score
- **Warning**: Moderate impact on score
- **Suggestion**: Lower impact on score
