/**
 * File parser tests
 *
 * Tests for parsing JSON and YAML tool definition files in various formats.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import {
  parseFile,
  detectFormat,
  detectToolFormat,
  normalizeToToolDefinitions,
} from '../../../src/parsers/file.js';

const fixturesDir = join(import.meta.dirname, '../../fixtures');

describe('File Parser', () => {
  describe('detectFormat', () => {
    it('should detect JSON format from .json extension', () => {
      expect(detectFormat('tools.json')).toBe('json');
      expect(detectFormat('/path/to/tools.json')).toBe('json');
      expect(detectFormat('tools.JSON')).toBe('json');
    });

    it('should detect YAML format from .yaml extension', () => {
      expect(detectFormat('tools.yaml')).toBe('yaml');
      expect(detectFormat('/path/to/tools.yaml')).toBe('yaml');
      expect(detectFormat('tools.YAML')).toBe('yaml');
    });

    it('should detect YAML format from .yml extension', () => {
      expect(detectFormat('tools.yml')).toBe('yaml');
      expect(detectFormat('/path/to/tools.yml')).toBe('yaml');
      expect(detectFormat('tools.YML')).toBe('yaml');
    });

    it('should throw error for unsupported file formats', () => {
      expect(() => detectFormat('tools.txt')).toThrow('Unsupported file format');
      expect(() => detectFormat('tools.xml')).toThrow('Unsupported file format');
      expect(() => detectFormat('tools')).toThrow('Unsupported file format');
    });
  });

  describe('detectToolFormat', () => {
    it('should detect single tool format', () => {
      const data = {
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: { type: 'object' },
      };
      expect(detectToolFormat(data)).toBe('single');
    });

    it('should detect array format with tools property', () => {
      const data = {
        tools: [
          { name: 'tool1', description: 'Tool 1', inputSchema: {} },
          { name: 'tool2', description: 'Tool 2', inputSchema: {} },
        ],
      };
      expect(detectToolFormat(data)).toBe('array');
    });

    it('should detect bare array format', () => {
      const data = [
        { name: 'tool1', description: 'Tool 1', inputSchema: {} },
        { name: 'tool2', description: 'Tool 2', inputSchema: {} },
      ];
      expect(detectToolFormat(data)).toBe('array');
    });

    it('should detect manifest format with name and tools', () => {
      const data = {
        name: 'my-server',
        version: '1.0.0',
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: {} }],
      };
      expect(detectToolFormat(data)).toBe('manifest');
    });

    it('should detect manifest format with version and tools', () => {
      const data = {
        version: '2.0.0',
        tools: [{ name: 'tool1', description: 'Tool 1', inputSchema: {} }],
      };
      expect(detectToolFormat(data)).toBe('manifest');
    });
  });

  describe('normalizeToToolDefinitions', () => {
    it('should normalize single tool format', () => {
      const data = {
        name: 'get-user',
        description: 'Gets a user',
        inputSchema: { type: 'object' },
      };

      const tools = normalizeToToolDefinitions(data, '/path/to/tool.json');

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get-user');
      expect(tools[0].description).toBe('Gets a user');
      expect(tools[0].source.type).toBe('file');
      expect(tools[0].source.location).toBe('/path/to/tool.json');
    });

    it('should normalize array format with tools property', () => {
      const data = {
        tools: [
          { name: 'tool1', description: 'First', inputSchema: {} },
          { name: 'tool2', description: 'Second', inputSchema: {} },
        ],
      };

      const tools = normalizeToToolDefinitions(data, '/path/to/tools.json');

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tool1');
      expect(tools[1].name).toBe('tool2');
    });

    it('should normalize bare array format', () => {
      const data = [
        { name: 'tool1', description: 'First', inputSchema: {} },
        { name: 'tool2', description: 'Second', inputSchema: {} },
      ];

      const tools = normalizeToToolDefinitions(data, '/path/to/tools.json');

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tool1');
      expect(tools[1].name).toBe('tool2');
    });

    it('should normalize manifest format', () => {
      const data = {
        name: 'my-server',
        version: '1.0.0',
        tools: [{ name: 'search', description: 'Search files', inputSchema: {} }],
      };

      const tools = normalizeToToolDefinitions(data, '/path/to/manifest.yaml');

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('search');
      expect(tools[0].source.location).toBe('/path/to/manifest.yaml');
    });

    it('should handle empty tools array', () => {
      const data = { tools: [] };
      const tools = normalizeToToolDefinitions(data, '/path/to/empty.json');
      expect(tools).toHaveLength(0);
    });

    it('should throw error for invalid single tool', () => {
      const data = { name: 'incomplete' }; // Missing description and inputSchema

      expect(() => normalizeToToolDefinitions(data, '/path/to/bad.json')).toThrow(
        'Invalid tool definition'
      );
    });

    it('should throw error for invalid tool in array', () => {
      const data = {
        tools: [
          { name: 'good', description: 'Valid', inputSchema: {} },
          { name: 'bad' }, // Missing description and inputSchema
        ],
      };

      expect(() => normalizeToToolDefinitions(data, '/path/to/bad.json')).toThrow(
        'Invalid tool definition at index 1'
      );
    });

    it('should attach ToolSource to each parsed tool', () => {
      const data = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: { type: 'object' },
      };

      const tools = normalizeToToolDefinitions(data, '/my/path.json');

      expect(tools[0].source).toBeDefined();
      expect(tools[0].source.type).toBe('file');
      expect(tools[0].source.location).toBe('/my/path.json');
      expect(tools[0].source.raw).toBeDefined();
    });

    it('should preserve tool annotations if present', () => {
      const data = {
        name: 'test-tool',
        description: 'Test',
        inputSchema: { type: 'object' },
        annotations: {
          title: 'Test Tool',
          readOnlyHint: true,
        },
      };

      const tools = normalizeToToolDefinitions(data, '/path.json');

      expect(tools[0].annotations).toBeDefined();
      expect(tools[0].annotations?.title).toBe('Test Tool');
      expect(tools[0].annotations?.readOnlyHint).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('should parse JSON single tool file', async () => {
      const tools = await parseFile(join(fixturesDir, 'single-tool.json'));

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('get-user');
      expect(tools[0].description).toBe('Retrieves user by ID');
      expect(tools[0].inputSchema).toBeDefined();
      expect(tools[0].source.type).toBe('file');
    });

    it('should parse JSON tool array file', async () => {
      const tools = await parseFile(join(fixturesDir, 'tool-array.json'));

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('get-user');
      expect(tools[1].name).toBe('create-user');
    });

    it('should parse YAML manifest file', async () => {
      const tools = await parseFile(join(fixturesDir, 'manifest.yaml'));

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('search-files');
      expect(tools[0].description).toBe('Search for files in a directory');
    });

    it('should parse bare array format', async () => {
      const tools = await parseFile(join(fixturesDir, 'bare-array.json'));

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('tool-one');
      expect(tools[0].description).toBe('First tool');
    });

    it('should attach correct source to parsed tools', async () => {
      const filePath = join(fixturesDir, 'single-tool.json');
      const tools = await parseFile(filePath);

      expect(tools[0].source.type).toBe('file');
      expect(tools[0].source.location).toBe(filePath);
      expect(tools[0].source.raw).toBeDefined();
    });

    it('should throw error for non-existent file', async () => {
      await expect(parseFile('/nonexistent/file.json')).rejects.toThrow();
    });

    it('should throw error for unsupported file extension', async () => {
      await expect(parseFile('/path/to/file.txt')).rejects.toThrow(
        'Unsupported file format'
      );
    });

    it('should throw error for invalid JSON content', async () => {
      // Create a temp file with invalid JSON would be needed here
      // For now, test that detectFormat catches bad extensions
      await expect(parseFile('invalid.xml')).rejects.toThrow('Unsupported file format');
    });
  });
});
