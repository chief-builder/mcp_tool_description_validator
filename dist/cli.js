#!/usr/bin/env node
import {
  formatHumanOutput,
  formatJsonOutput,
  formatSarifOutput,
  validateFile,
  validateServer
} from "./chunk-GVRVDTMV.js";

// src/cli.ts
import { Command } from "commander";
import chalk from "chalk";
var program = new Command();
function collectRules(value, previous) {
  const eqIndex = value.indexOf("=");
  if (eqIndex === -1) {
    previous[value] = "";
    return previous;
  }
  const id = value.slice(0, eqIndex);
  const setting = value.slice(eqIndex + 1);
  if (id && setting) {
    previous[id] = setting;
  }
  return previous;
}
function parseRuleOverrides(ruleOverrides) {
  const rules = {};
  for (const [id, setting] of Object.entries(ruleOverrides)) {
    const normalizedSetting = setting.toLowerCase();
    if (normalizedSetting === "off" || normalizedSetting === "false") {
      rules[id] = false;
    } else if (normalizedSetting === "on" || normalizedSetting === "true") {
      rules[id] = true;
    } else if (normalizedSetting === "error" || normalizedSetting === "warning" || normalizedSetting === "suggestion") {
      rules[id] = normalizedSetting;
    }
  }
  return rules;
}
async function runValidation(file, options) {
  if (!file && !options.server) {
    console.error(
      chalk.red("Error:"),
      "Must provide a file path or --server option"
    );
    process.exit(2);
  }
  const config = {
    output: {
      format: options.format,
      verbose: options.verbose ?? false,
      color: options.color !== false
    },
    rules: parseRuleOverrides(options.rule || {})
  };
  if (options.llm) {
    config.llm = {
      enabled: true,
      provider: options.llmProvider || "anthropic",
      model: "",
      timeout: 3e4
    };
  }
  const result = file ? await validateFile(file, { config, configPath: options.config }) : await validateServer(options.server, { config, configPath: options.config });
  let output;
  switch (options.format) {
    case "json":
      output = formatJsonOutput(result);
      break;
    case "sarif":
      output = formatSarifOutput(result);
      break;
    default:
      output = formatHumanOutput(result, {
        color: options.color !== false,
        verbose: options.verbose
      });
  }
  if (options.quiet && options.format === "human") {
    const lines = output.split("\n");
    const filteredLines = lines.filter((line) => {
      return line.includes("MCP Tool Validator") || line.includes("Validating:") || line.includes("ERROR") || line.includes("Summary:") || line.includes("Errors:") || line.includes("Validation failed") || line.includes("Validation passed") || line.match(/^[^\s]/) || // Tool names (start of line)
      line.trim() === "" || line.includes("\u2500");
    });
    output = filteredLines.join("\n");
  }
  console.log(output);
  if (options.ci && !result.valid) {
    process.exit(1);
  }
}
program.name("mcp-validate").description(
  "Validate MCP tool definitions for quality, security, and LLM compatibility"
).version("0.1.0").argument("[file]", "Tool definition file to validate (JSON or YAML)").option("-s, --server <url>", "Validate tools from a live MCP server").option(
  "-f, --format <format>",
  "Output format: human, json, sarif",
  "human"
).option("-c, --config <path>", "Path to config file").option(
  "-r, --rule <rule>",
  "Override rule: RULE-ID=on|off|error|warning|suggestion",
  collectRules,
  {}
).option("--llm", "Enable LLM-assisted analysis").option(
  "--llm-provider <provider>",
  "LLM provider: openai, anthropic, ollama"
).option("-v, --verbose", "Verbose output").option("-q, --quiet", "Only show errors").option("--ci", "CI mode: exit 1 on any error").option("--no-color", "Disable colored output").action(async (file, options) => {
  try {
    await runValidation(file, options);
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : error
    );
    process.exit(2);
  }
});
program.command("serve").description("Start HTTP validation service").option("-p, --port <port>", "Port to listen on", "8080").option("-h, --host <host>", "Host to bind to", "localhost").action(async (options) => {
  console.log(`Starting validation server on ${options.host}:${options.port}...`);
  console.log(chalk.yellow("HTTP service not yet implemented"));
  console.log("This will be available in a future release.");
});
var isMainModule = typeof process !== "undefined" && process.argv[1] && (process.argv[1].endsWith("cli.js") || process.argv[1].endsWith("cli.ts") || process.argv[1].endsWith("mcp-validate.js") || process.argv[1].includes("/bin/mcp-validate"));
if (isMainModule) {
  program.parse();
}
export {
  collectRules,
  parseRuleOverrides,
  program
};
//# sourceMappingURL=cli.js.map