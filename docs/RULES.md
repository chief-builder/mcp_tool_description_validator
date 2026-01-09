# MCP Tool Description Validator Rules Reference

This document provides a comprehensive reference for all 46 validation rules implemented in the MCP Tool Description Validator. Rules are organized by category and include descriptions, rationale, severity levels, and examples.

## Table of Contents

- [Rule Categories](#rule-categories)
- [Severity Levels](#severity-levels)
- [Schema Validation (SCH)](#schema-validation-sch)
- [Naming Conventions (NAM)](#naming-conventions-nam)
- [Security Constraints (SEC)](#security-constraints-sec)
- [LLM Compatibility (LLM)](#llm-compatibility-llm)
- [Best Practices (BP)](#best-practices-bp)
- [Alignment with Sample Spec](#alignment-with-sample-spec)

---

## Rule Categories

| Category | Prefix | Count | Focus |
|----------|--------|-------|-------|
| Schema Validation | SCH | 8 | MCP protocol compliance and JSON Schema validity |
| Naming Conventions | NAM | 6 | Consistent, descriptive tool and parameter naming |
| Security Constraints | SEC | 10 | Input validation and security best practices |
| LLM Compatibility | LLM | 13 | Optimizing tool definitions for LLM understanding |
| Best Practices | BP | 9 | MCP annotations, schema design, and usability |

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

Validates that the inputSchema field is a valid JSON Schema document that can be compiled.

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

## Naming Conventions (NAM)

Naming rules ensure tool and parameter names are consistent, clear, and follow conventions.

### NAM-001: Tool name must be non-empty

**Severity:** error

Validates that tool names are provided and not empty.

---

### NAM-002: Tool name must use kebab-case format

**Severity:** error

Validates that tool names follow kebab-case naming convention.

**Good Example:**
```json
{ "name": "get-user-profile" }
{ "name": "create-file" }
{ "name": "list-items" }
```

**Bad Example:**
```json
{ "name": "getUser" }
{ "name": "get_user" }
{ "name": "GetUser" }
{ "name": "GET-USER" }
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

Validates that tool names start with action verbs that clearly indicate what the tool does. This improves discoverability and helps LLMs understand when to use the tool.

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

## Security Constraints (SEC)

Security rules help prevent common vulnerabilities and ensure safe input handling.

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

Parameters with names suggesting sensitive data (password, token, key, secret) are flagged for review to ensure proper security handling.

**Note:** This is an awareness rule. It flags parameters that need special handling such as avoiding logging, using secure transmission, etc.

---

### SEC-008: No default values for security-sensitive parameters

**Severity:** error

Security-sensitive parameters (passwords, tokens, keys, secrets) should never have default values.

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

Objects that accept additional properties beyond those defined in the schema can be a security risk as they may allow injection of unexpected data.

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

The description should contain conditional phrases that help the LLM understand when to select this tool.

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

Descriptions should include examples or illustrations to help the LLM understand how to use the tool.

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

Parameter names and descriptions should avoid generic terms like "data", "value", "input" without providing context.

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

When a parameter has schema constraints (minimum, maximum, maxLength, pattern, enum), those constraints should be mentioned in the description.

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

Parameter names and descriptions should avoid unexplained abbreviations and technical jargon.

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

Tools with side effects (creating, deleting, modifying, sending data) should mention these effects in their description.

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

The description should contain guidance about prerequisites, alternatives, or sequencing to help the LLM understand how to use the tool in context.

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

### BP-001: Consider adding title annotation for display purposes

**Severity:** suggestion

Tools should have a `title` annotation for better UI display.

**Good Example:**
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

## Alignment with Sample Spec

This validator was designed to align with best practices from the MCP specification and community guidelines. The sample spec (located at `docs/specs/sample.md`) emphasizes:

### What the Validator Covers (from Sample Spec)

| Sample Spec Recommendation | Validator Rules |
|---------------------------|-----------------|
| Keep descriptions concise (1-2 sentences) | LLM-002 |
| Structure as "[Verb] a [resource]" | LLM-003, NAM-005 |
| Front-load critical information | LLM-003, LLM-004 |
| Include workflow guidance | LLM-013 |
| Clarify scope and limitations | LLM-004, LLM-011 |
| Use clear, unambiguous naming | NAM-002, NAM-005, NAM-006 |
| Describe parameters thoroughly | LLM-006, LLM-007, LLM-008 |
| Provide outputSchema when possible | BP-009 |
| Use JSON Schema features effectively | SCH-004 through SCH-008 |
| Namespaced/unique naming | NAM-002, NAM-003 |
| Handle errors helpfully | (Implementation concern) |

### Extensions Beyond Sample Spec

The validator includes additional rules not explicitly covered in the sample spec but valuable for production use:

1. **Security Rules (SEC-001 through SEC-010)**: Input validation and security best practices
2. **MCP Annotations (BP-001 through BP-004)**: title, readOnlyHint, destructiveHint, idempotentHint
3. **Schema Complexity (BP-005 through BP-008)**: Parameter counts, nesting depth, schema reuse
4. **Abbreviation Detection (LLM-010)**: Flags unexplained technical jargon
5. **Consistency Checking (LLM-012)**: Ensures related tools have consistent patterns

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
