#!/usr/bin/env npx tsx
/**
 * Test Official MCP Servers
 *
 * Runs the MCP Tool Definition Validator against official
 * Anthropic MCP servers to evaluate validation effectiveness.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { validateServer } from '../src/core/validator.js';
import type { ValidationResult } from '../src/types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

/**
 * Server configuration for testing.
 */
interface ServerConfig {
  name: string;
  command: string;
  description: string;
}

/**
 * Official MCP servers to test.
 *
 * Note: filesystem requires a path argument, so we use the project root.
 * Sequential-thinking may need special handling.
 */
const SERVERS: ServerConfig[] = [
  {
    name: 'filesystem',
    command: `npx -y @modelcontextprotocol/server-filesystem ${path.join(__dirname, '..')}`,
    description: 'Secure file operations with configurable access controls',
  },
  {
    name: 'memory',
    command: 'npx -y @modelcontextprotocol/server-memory',
    description: 'Knowledge graph-based persistent memory system',
  },
  {
    name: 'everything',
    command: 'npx -y @modelcontextprotocol/server-everything',
    description: 'Reference/test server with multiple tool types',
  },
  {
    name: 'sequential-thinking',
    command: 'npx -y @modelcontextprotocol/server-sequential-thinking',
    description: 'Dynamic and reflective problem-solving through thought sequences',
  },
];

/**
 * Test result for a single server.
 */
interface ServerTestResult {
  server: string;
  description: string;
  command: string;
  success: boolean;
  error?: string;
  toolCount?: number;
  result?: ValidationResult;
}

/**
 * Test a single MCP server.
 */
async function testServer(config: ServerConfig): Promise<ServerTestResult> {
  console.log(`\n📦 Testing ${config.name}...`);
  console.log(`   Command: ${config.command}`);

  try {
    const result = await validateServer(config.command, {
      config: {
        // Use default rules
      },
    });

    console.log(`   ✅ Found ${result.summary.totalTools} tools`);
    console.log(`   Issues: ${result.summary.totalIssues} total`);
    console.log(`     - Errors: ${result.summary.issuesBySeverity.error}`);
    console.log(`     - Warnings: ${result.summary.issuesBySeverity.warning}`);
    console.log(`     - Suggestions: ${result.summary.issuesBySeverity.suggestion}`);

    return {
      server: config.name,
      description: config.description,
      command: config.command,
      success: true,
      toolCount: result.summary.totalTools,
      result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ Failed: ${errorMessage}`);

    return {
      server: config.name,
      description: config.description,
      command: config.command,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Generate summary markdown report.
 */
function generateSummaryMarkdown(results: ServerTestResult[]): string {
  const successCount = results.filter((r) => r.success).length;
  const totalTools = results.reduce((sum, r) => sum + (r.toolCount || 0), 0);
  const totalErrors = results.reduce(
    (sum, r) => sum + (r.result?.summary.issuesBySeverity.error || 0),
    0
  );
  const totalWarnings = results.reduce(
    (sum, r) => sum + (r.result?.summary.issuesBySeverity.warning || 0),
    0
  );
  const totalSuggestions = results.reduce(
    (sum, r) => sum + (r.result?.summary.issuesBySeverity.suggestion || 0),
    0
  );

  let md = `# MCP Tool Definition Validator - Official Server Test Results

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Servers Tested | ${results.length} |
| Successful | ${successCount} |
| Failed | ${results.length - successCount} |
| Total Tools | ${totalTools} |
| Total Errors | ${totalErrors} |
| Total Warnings | ${totalWarnings} |
| Total Suggestions | ${totalSuggestions} |

## Per-Server Results

`;

  for (const r of results) {
    md += `### ${r.server}\n\n`;
    md += `**Description:** ${r.description}\n\n`;

    if (r.success && r.result) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Status | ✅ Success |\n`;
      md += `| Tools | ${r.toolCount} |\n`;
      md += `| Valid | ${r.result.valid ? 'Yes' : 'No'} |\n`;
      md += `| Errors | ${r.result.summary.issuesBySeverity.error} |\n`;
      md += `| Warnings | ${r.result.summary.issuesBySeverity.warning} |\n`;
      md += `| Suggestions | ${r.result.summary.issuesBySeverity.suggestion} |\n\n`;

      // List tools
      if (r.result.tools.length > 0) {
        md += `**Tools:**\n`;
        for (const tool of r.result.tools) {
          const status = tool.valid ? '✅' : '❌';
          md += `- ${status} \`${tool.name}\`\n`;
        }
        md += '\n';
      }

      // List issues by rule
      if (r.result.issues.length > 0) {
        const issuesByRule = new Map<string, number>();
        for (const issue of r.result.issues) {
          issuesByRule.set(issue.id, (issuesByRule.get(issue.id) || 0) + 1);
        }

        md += `**Issues by Rule:**\n`;
        for (const [ruleId, count] of Array.from(issuesByRule.entries()).sort()) {
          md += `- \`${ruleId}\`: ${count} occurrence(s)\n`;
        }
        md += '\n';
      }
    } else {
      md += `| Status | ❌ Failed |\n`;
      md += `| Error | ${r.error} |\n\n`;
    }
  }

  // Common issues section
  md += `## Common Issues Across Servers\n\n`;

  const allIssuesByRule = new Map<string, { count: number; servers: string[] }>();
  for (const r of results) {
    if (r.result) {
      const rulesSeen = new Set<string>();
      for (const issue of r.result.issues) {
        if (!rulesSeen.has(issue.id)) {
          rulesSeen.add(issue.id);
          const entry = allIssuesByRule.get(issue.id) || { count: 0, servers: [] };
          entry.count += 1;
          entry.servers.push(r.server);
          allIssuesByRule.set(issue.id, entry);
        }
      }
    }
  }

  if (allIssuesByRule.size > 0) {
    md += `| Rule | Occurrences | Servers |\n|------|-------------|--------|\n`;
    for (const [ruleId, data] of Array.from(allIssuesByRule.entries()).sort(
      (a, b) => b[1].count - a[1].count
    )) {
      md += `| \`${ruleId}\` | ${data.count} | ${data.servers.join(', ')} |\n`;
    }
  } else {
    md += `No common issues found.\n`;
  }

  return md;
}

/**
 * Main entry point.
 */
async function main() {
  console.log('🔍 MCP Tool Definition Validator - Official Server Tests\n');
  console.log('=' .repeat(60));

  // Ensure reports directory exists
  await fs.mkdir(REPORTS_DIR, { recursive: true });

  const results: ServerTestResult[] = [];

  // Test each server sequentially
  for (const server of SERVERS) {
    const result = await testServer(server);
    results.push(result);

    // Save individual result
    if (result.result) {
      const reportPath = path.join(REPORTS_DIR, `${server.name}.json`);
      await fs.writeFile(reportPath, JSON.stringify(result.result, null, 2));
      console.log(`   📄 Saved: reports/${server.name}.json`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Generating summary report...\n');

  // Generate and save summary
  const summaryMd = generateSummaryMarkdown(results);
  const summaryPath = path.join(REPORTS_DIR, 'summary.md');
  await fs.writeFile(summaryPath, summaryMd);
  console.log(`📄 Saved: reports/summary.md`);

  // Print summary
  const successCount = results.filter((r) => r.success).length;
  console.log(`\n✨ Complete: ${successCount}/${results.length} servers tested successfully`);

  // Exit with error if any server failed
  if (successCount < results.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
