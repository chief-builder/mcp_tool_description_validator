#!/usr/bin/env node
/**
 * LLM Analysis Script
 *
 * Runs LLM-assisted analysis on MCP server fixtures and generates a report.
 * Uses Anthropic SDK directly.
 */

import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const FIXTURES_DIR = './tests/fixtures';
const REPORT_PATH = './reports/mcp-server-validation-by-llm-2025-01-08.md';

const SERVERS = [
  { name: 'filesystem', file: 'official-filesystem.json', maintainer: 'Anthropic' },
  { name: 'memory', file: 'official-memory.json', maintainer: 'Anthropic' },
  { name: 'everything', file: 'official-everything.json', maintainer: 'Anthropic' },
  { name: 'sequential-thinking', file: 'official-sequential-thinking.json', maintainer: 'Anthropic' },
  { name: 'playwright', file: 'thirdparty-playwright.json', maintainer: 'Microsoft' },
  { name: 'sqlite', file: 'thirdparty-sqlite.json', maintainer: 'Community' },
];

// Load API key from environment
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY not set. Run: source .env');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

const ANALYSIS_PROMPT = `You are evaluating MCP tool definitions for LLM compatibility.

Tool Definition:
- Name: {name}
- Description: {description}
- Parameters: {parameters}

Evaluate this tool definition and respond with JSON only (no markdown code blocks):
{
  "clarity_score": <1-10>,
  "completeness_score": <1-10>,
  "ambiguities": ["list of vague phrases"],
  "conflicts": ["list of description/schema mismatches"],
  "suggestions": ["list of specific improvements"]
}

Consider:
- Would an AI understand when to call this tool?
- Are there edge cases not addressed?
- Could the description lead to incorrect usage?`;

function formatParameters(inputSchema) {
  const properties = inputSchema?.properties || {};
  const required = inputSchema?.required || [];

  const params = Object.entries(properties).map(([name, schema]) => {
    const isRequired = required.includes(name);
    return `- ${name}${isRequired ? ' (required)' : ''}: ${schema.type || 'any'} - ${schema.description || 'no description'}`;
  });

  return params.length > 0 ? params.join('\n') : 'No parameters';
}

async function analyzeTool(tool) {
  const prompt = ANALYSIS_PROMPT
    .replace('{name}', tool.name)
    .replace('{description}', tool.description || 'No description')
    .replace('{parameters}', formatParameters(tool.inputSchema));

  const message = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text;

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const result = JSON.parse(jsonMatch[0]);

  return {
    clarity_score: Math.min(10, Math.max(1, result.clarity_score || 5)),
    completeness_score: Math.min(10, Math.max(1, result.completeness_score || 5)),
    ambiguities: Array.isArray(result.ambiguities) ? result.ambiguities : [],
    conflicts: Array.isArray(result.conflicts) ? result.conflicts : [],
    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
  };
}

async function analyzeServer(server) {
  const fixturePath = path.join(FIXTURES_DIR, server.file);
  const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

  const tools = data.tools.map(t => t.tool);
  const results = [];

  console.log(`\nAnalyzing ${server.name} (${tools.length} tools)...`);

  for (const tool of tools) {
    try {
      process.stdout.write(`  - ${tool.name}... `);
      const result = await analyzeTool(tool);
      results.push({ tool: tool.name, ...result });
      console.log(`clarity: ${result.clarity_score}, completeness: ${result.completeness_score}`);
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.log(`Error: ${error.message}`);
      results.push({
        tool: tool.name,
        clarity_score: 0,
        completeness_score: 0,
        ambiguities: [],
        conflicts: [],
        suggestions: [`Analysis failed: ${error.message}`]
      });
    }
  }

  return results;
}

function calculateAverages(results) {
  const validResults = results.filter(r => r.clarity_score > 0);
  if (validResults.length === 0) return { clarity: '0.0', completeness: '0.0' };

  const clarity = validResults.reduce((sum, r) => sum + r.clarity_score, 0) / validResults.length;
  const completeness = validResults.reduce((sum, r) => sum + r.completeness_score, 0) / validResults.length;
  return { clarity: clarity.toFixed(1), completeness: completeness.toFixed(1) };
}

async function main() {
  console.log('MCP Tool LLM Analysis');
  console.log('=====================');
  console.log('Using model: claude-3-haiku-20240307');

  const allResults = {};

  for (const server of SERVERS) {
    allResults[server.name] = {
      ...server,
      results: await analyzeServer(server),
    };
  }

  // Generate report
  let report = `# MCP Server Tool LLM Analysis Report

**Date:** ${new Date().toISOString().split('T')[0]}
**Model:** claude-3-haiku-20240307
**Analysis Type:** Semantic quality evaluation

---

## Executive Summary

LLM-assisted analysis of **${Object.values(allResults).reduce((sum, s) => sum + s.results.length, 0)} tools** from **${SERVERS.length} MCP servers**.

| Server | Maintainer | Tools | Clarity | Completeness |
|--------|------------|-------|---------|--------------|
`;

  for (const [name, data] of Object.entries(allResults)) {
    const avg = calculateAverages(data.results);
    report += `| ${name} | ${data.maintainer} | ${data.results.length} | ${avg.clarity}/10 | ${avg.completeness}/10 |\n`;
  }

  report += `
---

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 9-10 | Excellent - Clear, complete, no ambiguity |
| 7-8 | Good - Minor improvements possible |
| 5-6 | Moderate - Some clarity or completeness issues |
| 3-4 | Poor - Significant issues |
| 1-2 | Very Poor - Major rewrite needed |

---

## Detailed Results

`;

  for (const [serverName, data] of Object.entries(allResults)) {
    const avg = calculateAverages(data.results);
    report += `### ${serverName} (Clarity: ${avg.clarity}, Completeness: ${avg.completeness})

| Tool | Clarity | Completeness | Ambiguities | Conflicts |
|------|---------|--------------|-------------|-----------|
`;

    for (const r of data.results) {
      report += `| ${r.tool} | ${r.clarity_score} | ${r.completeness_score} | ${r.ambiguities.length} | ${r.conflicts.length} |\n`;
    }

    // Collect all issues
    const allAmbiguities = data.results.flatMap(r =>
      r.ambiguities.map(a => `- **${r.tool}**: ${a}`)
    );
    const allConflicts = data.results.flatMap(r =>
      r.conflicts.map(c => `- **${r.tool}**: ${c}`)
    );
    const allSuggestions = data.results.flatMap(r =>
      r.suggestions.map(s => `- **${r.tool}**: ${s}`)
    );

    if (allAmbiguities.length > 0) {
      report += `
**Ambiguities Found:**
${allAmbiguities.slice(0, 5).join('\n')}
${allAmbiguities.length > 5 ? `\n*...and ${allAmbiguities.length - 5} more*` : ''}
`;
    }

    if (allConflicts.length > 0) {
      report += `
**Conflicts Found:**
${allConflicts.slice(0, 5).join('\n')}
${allConflicts.length > 5 ? `\n*...and ${allConflicts.length - 5} more*` : ''}
`;
    }

    if (allSuggestions.length > 0) {
      report += `
**Top Suggestions:**
${allSuggestions.slice(0, 5).join('\n')}
${allSuggestions.length > 5 ? `\n*...and ${allSuggestions.length - 5} more*` : ''}
`;
    }

    report += '\n---\n\n';
  }

  report += `
## Methodology

This analysis uses Claude 3 Haiku to evaluate each tool definition for:

1. **Clarity** (1-10): Would an AI understand when to call this tool?
2. **Completeness** (1-10): Does the description cover what, when, and how?
3. **Ambiguities**: Vague phrases that could cause misuse
4. **Conflicts**: Mismatches between description and schema
5. **Suggestions**: Specific improvement recommendations

---

*Generated by MCP Tool Validator LLM Analyzer*
*Model: claude-3-haiku-20240307*
`;

  fs.writeFileSync(REPORT_PATH, report);
  console.log(`\nReport saved to: ${REPORT_PATH}`);
}

main().catch(console.error);
