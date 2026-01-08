// src/core/config.ts
import { cosmiconfig } from "cosmiconfig";
var DEFAULT_OUTPUT = {
  format: "human",
  verbose: false,
  color: true
};
var DEFAULT_RULES = {
  // Schema rules (SCH-xxx)
  "SCH-001": true,
  "SCH-002": true,
  "SCH-003": true,
  "SCH-004": true,
  "SCH-005": true,
  "SCH-006": true,
  "SCH-007": true,
  "SCH-008": true,
  // Naming rules (NAM-xxx)
  "NAM-001": true,
  "NAM-002": true,
  "NAM-003": true,
  "NAM-004": true,
  "NAM-005": true,
  "NAM-006": true,
  // Security rules (SEC-xxx)
  "SEC-001": true,
  "SEC-002": true,
  "SEC-003": true,
  "SEC-004": true,
  "SEC-005": true,
  "SEC-006": true,
  "SEC-007": true,
  "SEC-008": true,
  "SEC-009": true,
  "SEC-010": true,
  // LLM compatibility rules (LLM-xxx)
  "LLM-001": true,
  "LLM-002": true,
  "LLM-003": true,
  "LLM-004": true,
  "LLM-005": true,
  "LLM-006": true,
  "LLM-007": true,
  "LLM-008": true,
  "LLM-009": true,
  "LLM-010": true,
  "LLM-011": true,
  "LLM-012": true,
  // Best practice rules (BP-xxx)
  "BP-001": true,
  "BP-002": true,
  "BP-003": true,
  "BP-004": true,
  "BP-005": true,
  "BP-006": true,
  "BP-007": true,
  "BP-008": true
};
var MODULE_NAME = "mcp-validate";
function createExplorer() {
  return cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      // YAML variants (preferred)
      `${MODULE_NAME}.config.yaml`,
      `${MODULE_NAME}.config.yml`,
      // JSON variants
      `${MODULE_NAME}.config.json`,
      // RC file variants
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}rc.json`,
      // Package.json
      "package.json"
    ],
    packageProp: MODULE_NAME
  });
}
async function loadConfig(configPath) {
  const explorer = createExplorer();
  try {
    let result;
    if (configPath) {
      result = await explorer.load(configPath);
    } else {
      result = await explorer.search();
    }
    if (result && !result.isEmpty) {
      const mergedConfig = mergeConfig(result.config);
      return {
        config: mergedConfig,
        filepath: result.filepath
      };
    }
    return {
      config: getDefaultConfig(),
      filepath: null
    };
  } catch (error) {
    if (configPath) {
      throw error;
    }
    return {
      config: getDefaultConfig(),
      filepath: null
    };
  }
}
function mergeConfig(userConfig) {
  const defaultConfig = getDefaultConfig();
  const mergedRules = {
    ...defaultConfig.rules,
    ...userConfig.rules ?? {}
  };
  const mergedOutput = {
    ...defaultConfig.output,
    ...userConfig.output ?? {}
  };
  const mergedConfig = {
    rules: mergedRules,
    output: mergedOutput
  };
  if (userConfig.llm) {
    mergedConfig.llm = userConfig.llm;
  }
  return mergedConfig;
}
function getDefaultConfig() {
  return {
    rules: { ...DEFAULT_RULES },
    output: { ...DEFAULT_OUTPUT }
  };
}

// src/parsers/file.ts
import { readFile } from "fs/promises";
import { parse as parseYaml } from "yaml";
async function parseFile(filePath) {
  const format = detectFormat(filePath);
  const content = await readFile(filePath, "utf-8");
  let data;
  try {
    data = format === "json" ? JSON.parse(content) : parseYaml(content);
  } catch (error) {
    const parseError = error;
    throw new Error(
      `Failed to parse ${format.toUpperCase()} file "${filePath}": ${parseError.message}`
    );
  }
  return normalizeToToolDefinitions(data, filePath);
}
function detectFormat(filePath) {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith(".json")) return "json";
  if (lowerPath.endsWith(".yaml") || lowerPath.endsWith(".yml")) return "yaml";
  throw new Error(
    `Unsupported file format: "${filePath}". Expected .json, .yaml, or .yml extension.`
  );
}
function detectToolFormat(data) {
  if (Array.isArray(data)) {
    return "array";
  }
  if (typeof data === "object" && data !== null) {
    const obj = data;
    if ("tools" in obj && Array.isArray(obj.tools)) {
      if ("name" in obj || "version" in obj) {
        return "manifest";
      }
      return "array";
    }
    if ("name" in obj && "description" in obj && "inputSchema" in obj) {
      return "single";
    }
  }
  return "single";
}
function isToolLike(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const record = obj;
  return typeof record.name === "string" && typeof record.description === "string" && typeof record.inputSchema === "object" && record.inputSchema !== null;
}
function toToolDefinition(raw, source) {
  return {
    name: raw.name,
    description: raw.description,
    inputSchema: raw.inputSchema,
    annotations: raw.annotations,
    source: {
      ...source,
      raw
    }
  };
}
function normalizeToToolDefinitions(data, sourcePath) {
  const source = {
    type: "file",
    location: sourcePath,
    raw: data
  };
  const format = detectToolFormat(data);
  switch (format) {
    case "single": {
      if (!isToolLike(data)) {
        throw new Error(
          `Invalid tool definition in "${sourcePath}": expected object with name, description, and inputSchema properties.`
        );
      }
      return [toToolDefinition(data, source)];
    }
    case "array": {
      let tools;
      if (Array.isArray(data)) {
        tools = data;
      } else {
        const obj = data;
        tools = obj.tools;
      }
      if (tools.length === 0) {
        return [];
      }
      return tools.map((tool, index) => {
        if (!isToolLike(tool)) {
          throw new Error(
            `Invalid tool definition at index ${index} in "${sourcePath}": expected object with name, description, and inputSchema properties.`
          );
        }
        return toToolDefinition(tool, source);
      });
    }
    case "manifest": {
      const manifest = data;
      const tools = manifest.tools;
      if (!Array.isArray(tools)) {
        throw new Error(
          `Invalid manifest in "${sourcePath}": tools property must be an array.`
        );
      }
      if (tools.length === 0) {
        return [];
      }
      return tools.map((tool, index) => {
        if (!isToolLike(tool)) {
          throw new Error(
            `Invalid tool definition at index ${index} in manifest "${sourcePath}": expected object with name, description, and inputSchema properties.`
          );
        }
        return toToolDefinition(tool, source);
      });
    }
    default: {
      throw new Error(
        `Unable to parse tool definitions from "${sourcePath}": unrecognized format.`
      );
    }
  }
}

// src/parsers/mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
function isHttpServer(server) {
  return server.startsWith("http://") || server.startsWith("https://");
}
async function connectToServer(config) {
  const { server, timeout = 3e4 } = config;
  let transport;
  if (isHttpServer(server)) {
    transport = new StreamableHTTPClientTransport(new URL(server));
  } else {
    const parts = server.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    transport = new StdioClientTransport({
      command,
      args
    });
  }
  const client = new Client(
    {
      name: "mcp-tool-validator",
      version: "0.1.0"
    },
    {
      capabilities: {}
    }
  );
  const connectPromise = client.connect(transport);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Connection to MCP server timed out after ${timeout}ms`));
    }, timeout);
  });
  await Promise.race([connectPromise, timeoutPromise]);
  return { client, transport };
}
async function getToolDefinitions(connection, serverUrl) {
  const response = await connection.client.listTools();
  return response.tools.map((tool) => {
    const source = {
      type: "server",
      location: serverUrl,
      raw: tool
    };
    return {
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema,
      annotations: tool.annotations ? {
        title: tool.annotations.title,
        readOnlyHint: tool.annotations.readOnlyHint,
        destructiveHint: tool.annotations.destructiveHint,
        idempotentHint: tool.annotations.idempotentHint,
        openWorldHint: tool.annotations.openWorldHint
      } : void 0,
      source
    };
  });
}
async function disconnect(connection) {
  await connection.client.close();
}
async function fetchToolsFromServer(config) {
  const connection = await connectToServer(config);
  try {
    return await getToolDefinitions(connection, config.server);
  } finally {
    await disconnect(connection);
  }
}

// src/rules/index.ts
var RULE_PATHS = {
  // Schema rules (8 rules)
  "SCH-001": "./schema/sch-001.js",
  "SCH-002": "./schema/sch-002.js",
  "SCH-003": "./schema/sch-003.js",
  "SCH-004": "./schema/sch-004.js",
  "SCH-005": "./schema/sch-005.js",
  "SCH-006": "./schema/sch-006.js",
  "SCH-007": "./schema/sch-007.js",
  "SCH-008": "./schema/sch-008.js",
  // Naming rules (6 rules)
  "NAM-001": "./naming/nam-001.js",
  "NAM-002": "./naming/nam-002.js",
  "NAM-003": "./naming/nam-003.js",
  "NAM-004": "./naming/nam-004.js",
  "NAM-005": "./naming/nam-005.js",
  "NAM-006": "./naming/nam-006.js",
  // Security rules (10 rules)
  "SEC-001": "./security/sec-001.js",
  "SEC-002": "./security/sec-002.js",
  "SEC-003": "./security/sec-003.js",
  "SEC-004": "./security/sec-004.js",
  "SEC-005": "./security/sec-005.js",
  "SEC-006": "./security/sec-006.js",
  "SEC-007": "./security/sec-007.js",
  "SEC-008": "./security/sec-008.js",
  "SEC-009": "./security/sec-009.js",
  "SEC-010": "./security/sec-010.js",
  // LLM Compatibility rules (12 rules)
  "LLM-001": "./llm-compatibility/llm-001.js",
  "LLM-002": "./llm-compatibility/llm-002.js",
  "LLM-003": "./llm-compatibility/llm-003.js",
  "LLM-004": "./llm-compatibility/llm-004.js",
  "LLM-005": "./llm-compatibility/llm-005.js",
  "LLM-006": "./llm-compatibility/llm-006.js",
  "LLM-007": "./llm-compatibility/llm-007.js",
  "LLM-008": "./llm-compatibility/llm-008.js",
  "LLM-009": "./llm-compatibility/llm-009.js",
  "LLM-010": "./llm-compatibility/llm-010.js",
  "LLM-011": "./llm-compatibility/llm-011.js",
  "LLM-012": "./llm-compatibility/llm-012.js",
  // Best practice rules (8 rules)
  "BP-001": "./best-practice/bp-001.js",
  "BP-002": "./best-practice/bp-002.js",
  "BP-003": "./best-practice/bp-003.js",
  "BP-004": "./best-practice/bp-004.js",
  "BP-005": "./best-practice/bp-005.js",
  "BP-006": "./best-practice/bp-006.js",
  "BP-007": "./best-practice/bp-007.js",
  "BP-008": "./best-practice/bp-008.js"
};
function isRuleRegistered(ruleId) {
  return ruleId in RULE_PATHS;
}
async function loadRuleModule(ruleId) {
  const path = RULE_PATHS[ruleId];
  if (!path) {
    return null;
  }
  try {
    const module = await import(path);
    return module.default;
  } catch {
    return null;
  }
}

// src/core/rule-loader.ts
async function loadRules(config) {
  const rulesToLoad = /* @__PURE__ */ new Set();
  for (const [ruleId, setting] of Object.entries(config)) {
    if (setting !== false && isRuleRegistered(ruleId)) {
      rulesToLoad.add(ruleId);
    }
  }
  for (const ruleId of Object.keys(RULE_PATHS)) {
    if (!(ruleId in config)) {
      rulesToLoad.add(ruleId);
    }
  }
  const loadedRules = await Promise.all(
    Array.from(rulesToLoad).map((ruleId) => loadRuleModule(ruleId))
  );
  return loadedRules.filter((rule) => rule !== null);
}
function getEffectiveSeverity(rule, config) {
  const setting = config[rule.id];
  if (typeof setting === "string") {
    return setting;
  }
  return rule.defaultSeverity;
}

// src/core/rule-engine.ts
function executeRules(tools, rules, config) {
  const results = [];
  for (const tool of tools) {
    const issues = [];
    for (const rule of rules) {
      if (config[rule.id] === false) continue;
      const ctx = {
        allTools: tools,
        ruleConfig: config[rule.id] ?? true
      };
      const ruleIssues = rule.check(tool, ctx);
      const effectiveSeverity = getEffectiveSeverity(rule, config);
      for (const issue of ruleIssues) {
        issues.push({
          ...issue,
          severity: effectiveSeverity
        });
      }
    }
    results.push({ tool, issues });
  }
  return results;
}
function aggregateResults(results) {
  const issuesByCategory = {
    "schema": 0,
    "security": 0,
    "llm-compatibility": 0,
    "naming": 0,
    "best-practice": 0
  };
  const issuesBySeverity = {
    "error": 0,
    "warning": 0,
    "suggestion": 0
  };
  let validTools = 0;
  for (const result of results) {
    const hasErrors = result.issues.some((i) => i.severity === "error");
    if (!hasErrors) validTools++;
    for (const issue of result.issues) {
      issuesByCategory[issue.category]++;
      issuesBySeverity[issue.severity]++;
    }
  }
  return {
    totalTools: results.length,
    validTools,
    issuesByCategory,
    issuesBySeverity
  };
}
function flattenIssues(results) {
  return results.flatMap((r) => r.issues);
}

// src/core/validator.ts
var VALIDATOR_VERSION = "0.1.0";
var MCP_SPEC_VERSION = "2025-11-25";
async function validate(tools, options = {}) {
  const startTime = Date.now();
  let config;
  if (options.configPath) {
    const loaded = await loadConfig(options.configPath);
    config = loaded.config;
  } else {
    config = getDefaultConfig();
  }
  if (options.config) {
    config = mergeConfig({ ...config, ...options.config });
  }
  const rules = await loadRules(config.rules);
  const toolResults = executeRules(tools, rules, config.rules);
  const toolValidationResults = toolResults.map((tr) => ({
    name: tr.tool.name,
    valid: !tr.issues.some((i) => i.severity === "error"),
    tool: tr.tool,
    issues: tr.issues
  }));
  const summary = aggregateResults(toolResults);
  const allIssues = flattenIssues(toolResults);
  const metadata = {
    validatorVersion: VALIDATOR_VERSION,
    mcpSpecVersion: MCP_SPEC_VERSION,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    duration: Date.now() - startTime,
    configUsed: options.configPath || "",
    llmAnalysisUsed: false
  };
  return {
    valid: summary.issuesBySeverity.error === 0,
    summary,
    issues: allIssues,
    tools: toolValidationResults,
    metadata
  };
}
async function validateFile(filePath, options = {}) {
  const tools = await parseFile(filePath);
  return validate(tools, options);
}
async function validateServer(serverUrl, options = {}) {
  const tools = await fetchToolsFromServer({ server: serverUrl });
  return validate(tools, options);
}

// src/reporters/human.ts
import chalk, { Chalk } from "chalk";
function formatHumanOutput(result, options = {}) {
  const { color = true, verbose = false } = options;
  const c = color ? chalk : new Chalk({ level: 0 });
  const lines = [];
  lines.push(`MCP Tool Validator v${result.metadata.validatorVersion}`);
  lines.push(c.gray("\u2500".repeat(50)));
  lines.push("");
  lines.push(`Validating: ${result.tools.length} tool(s)`);
  lines.push("");
  for (const toolResult of result.tools) {
    const hasErrors = toolResult.issues.some((i) => i.severity === "error");
    const icon = hasErrors ? c.red("\u2717") : c.green("\u2713");
    lines.push(`${icon} ${toolResult.tool.name}`);
    for (const issue of toolResult.issues) {
      const severityColor = issue.severity === "error" ? c.red : issue.severity === "warning" ? c.yellow : c.blue;
      const severityLabel = issue.severity.toUpperCase();
      lines.push(`  ${severityColor(severityLabel)} [${issue.id}] ${issue.message}`);
      if (issue.path) {
        lines.push(`    ${c.gray("at:")} ${issue.path}`);
      }
      if (issue.suggestion && verbose) {
        lines.push(`    ${c.gray("suggestion:")} ${issue.suggestion}`);
      }
    }
    lines.push("");
  }
  lines.push(c.gray("\u2500".repeat(50)));
  lines.push(`Summary: ${result.summary.validTools}/${result.summary.totalTools} tools valid`);
  lines.push("");
  lines.push(`  Errors:      ${result.summary.issuesBySeverity.error}`);
  lines.push(`  Warnings:    ${result.summary.issuesBySeverity.warning}`);
  lines.push(`  Suggestions: ${result.summary.issuesBySeverity.suggestion}`);
  lines.push("");
  lines.push("  By Category:");
  for (const [category, count] of Object.entries(result.summary.issuesByCategory)) {
    if (count > 0) {
      lines.push(`    ${category}: ${count}`);
    }
  }
  lines.push("");
  if (result.valid) {
    lines.push(c.green("Validation passed."));
  } else {
    lines.push(c.red(`Validation failed with ${result.summary.issuesBySeverity.error} error(s).`));
  }
  return lines.join("\n");
}

// src/reporters/json.ts
function formatJsonOutput(result) {
  return JSON.stringify(result, null, 2);
}

// src/reporters/sarif.ts
function severityToSarifLevel(severity) {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    default:
      return "note";
  }
}
function formatSarifOutput(result) {
  const uniqueRules = /* @__PURE__ */ new Map();
  for (const toolResult of result.tools) {
    for (const issue of toolResult.issues) {
      if (!uniqueRules.has(issue.id)) {
        uniqueRules.set(issue.id, issue);
      }
    }
  }
  const rules = Array.from(uniqueRules.values()).map((issue) => ({
    id: issue.id,
    name: issue.id,
    shortDescription: { text: issue.message },
    defaultConfiguration: {
      level: severityToSarifLevel(issue.severity)
    }
  }));
  const results = [];
  for (const toolResult of result.tools) {
    for (const issue of toolResult.issues) {
      results.push({
        ruleId: issue.id,
        level: severityToSarifLevel(issue.severity),
        message: { text: issue.message },
        locations: [{
          logicalLocations: [{
            name: issue.tool,
            kind: "tool",
            fullyQualifiedName: issue.path ? `${issue.tool}.${issue.path}` : issue.tool
          }]
        }]
      });
    }
  }
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "mcp-tool-validator",
          version: result.metadata.validatorVersion,
          informationUri: "https://github.com/example/mcp-tool-validator",
          rules
        }
      },
      results
    }]
  };
  return JSON.stringify(sarif, null, 2);
}

export {
  loadConfig,
  mergeConfig,
  getDefaultConfig,
  parseFile,
  connectToServer,
  getToolDefinitions,
  disconnect,
  fetchToolsFromServer,
  validate,
  validateFile,
  validateServer,
  formatHumanOutput,
  formatJsonOutput,
  formatSarifOutput
};
//# sourceMappingURL=chunk-GVRVDTMV.js.map