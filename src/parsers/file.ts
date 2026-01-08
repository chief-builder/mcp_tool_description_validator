import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { ToolDefinition, ToolSource } from '../types/index.js';

/**
 * Supported file formats for tool definitions.
 */
export type FileFormat = 'json' | 'yaml';

/**
 * Detected tool definition format.
 */
export type ToolFormat = 'single' | 'array' | 'manifest';

/**
 * Parse a file containing MCP tool definitions.
 *
 * Supports JSON and YAML files containing:
 * - Single tool definition
 * - Array of tool definitions (bare array or { tools: [...] })
 * - Manifest format with server metadata ({ name, version, tools: [...] })
 *
 * @param filePath - Path to the file to parse
 * @returns Array of parsed tool definitions with source metadata
 * @throws Error if file format is unsupported or parsing fails
 */
export async function parseFile(filePath: string): Promise<ToolDefinition[]> {
  // Validate format before reading to give clearer errors
  const format = detectFormat(filePath);
  const content = await readFile(filePath, 'utf-8');

  let data: unknown;
  try {
    data = format === 'json' ? JSON.parse(content) : parseYaml(content);
  } catch (error) {
    const parseError = error as Error;
    throw new Error(
      `Failed to parse ${format.toUpperCase()} file "${filePath}": ${parseError.message}`
    );
  }

  return normalizeToToolDefinitions(data, filePath);
}

/**
 * Detect file format from extension.
 *
 * @param filePath - Path to the file
 * @returns Detected file format
 * @throws Error if file extension is not supported
 */
export function detectFormat(filePath: string): FileFormat {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith('.json')) return 'json';
  if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml')) return 'yaml';
  throw new Error(
    `Unsupported file format: "${filePath}". Expected .json, .yaml, or .yml extension.`
  );
}

/**
 * Detect the format of parsed data.
 *
 * @param data - Parsed data to analyze
 * @returns Detected tool format
 */
export function detectToolFormat(data: unknown): ToolFormat {
  // Bare array of tools
  if (Array.isArray(data)) {
    return 'array';
  }

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check if it's a manifest (has name/version and tools)
    if ('tools' in obj && Array.isArray(obj.tools)) {
      if ('name' in obj || 'version' in obj) {
        return 'manifest';
      }
      return 'array';
    }

    // Single tool has name, description, inputSchema
    if ('name' in obj && 'description' in obj && 'inputSchema' in obj) {
      return 'single';
    }
  }

  // Default to single for unknown structures (will be validated later)
  return 'single';
}

/**
 * Check if an object looks like a valid tool definition.
 */
function isToolLike(obj: unknown): obj is Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  const record = obj as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    typeof record.description === 'string' &&
    typeof record.inputSchema === 'object' &&
    record.inputSchema !== null
  );
}

/**
 * Convert a raw tool object to a ToolDefinition with source attached.
 */
function toToolDefinition(
  raw: Record<string, unknown>,
  source: ToolSource
): ToolDefinition {
  return {
    name: raw.name as string,
    description: raw.description as string,
    inputSchema: raw.inputSchema as Record<string, unknown>,
    annotations: raw.annotations as ToolDefinition['annotations'],
    source: {
      ...source,
      raw: raw,
    },
  };
}

/**
 * Normalize various tool definition formats to array of ToolDefinition.
 *
 * Supports:
 * - Single tool: { name, description, inputSchema }
 * - Array of tools: { tools: [...] } or just [...]
 * - Manifest: { name: "server-name", version: "1.0.0", tools: [...] }
 *
 * @param data - Parsed data in any supported format
 * @param sourcePath - Path to the source file
 * @returns Array of ToolDefinition with source attached
 * @throws Error if data structure is invalid
 */
export function normalizeToToolDefinitions(
  data: unknown,
  sourcePath: string
): ToolDefinition[] {
  const source: ToolSource = {
    type: 'file',
    location: sourcePath,
    raw: data,
  };

  const format = detectToolFormat(data);

  switch (format) {
    case 'single': {
      if (!isToolLike(data)) {
        throw new Error(
          `Invalid tool definition in "${sourcePath}": expected object with name, description, and inputSchema properties.`
        );
      }
      return [toToolDefinition(data, source)];
    }

    case 'array': {
      let tools: unknown[];

      if (Array.isArray(data)) {
        // Bare array format
        tools = data;
      } else {
        // Object with tools array
        const obj = data as Record<string, unknown>;
        tools = obj.tools as unknown[];
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

    case 'manifest': {
      const manifest = data as Record<string, unknown>;
      const tools = manifest.tools as unknown[];

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
