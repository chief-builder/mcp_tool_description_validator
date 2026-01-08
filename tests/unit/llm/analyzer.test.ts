/**
 * LLM Analyzer Tests
 *
 * Tests for LLM-assisted analysis of MCP tool definitions.
 * All LLM calls are mocked to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ToolDefinition } from '../../../src/types/index.js';

// Mock the ai package
vi.mock('ai', () => ({
  generateText: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      clarity_score: 8,
      completeness_score: 7,
      ambiguities: ['vague term'],
      conflicts: [],
      suggestions: ['Add more detail'],
    }),
  }),
}));

// Mock provider packages (they're optional peer deps)
vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn().mockReturnValue('openai-model'),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn().mockReturnValue('anthropic-model'),
}));

vi.mock('ollama-ai-provider', () => ({
  ollama: vi.fn().mockReturnValue('ollama-model'),
}));

/**
 * Create a mock tool definition for testing.
 */
function createMockTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    name: 'test-tool',
    description: 'A test tool for searching data.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
    source: { type: 'file', location: 'test.json', raw: {} },
    ...overrides,
  };
}

describe('LLM Analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeTool()', () => {
    it('should export analyzeTool function', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      expect(typeof analyzeTool).toBe('function');
    });

    it('should analyze a tool with mocked LLM (anthropic provider)', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(8);
      expect(result.completeness_score).toBe(7);
      expect(result.ambiguities).toContain('vague term');
      expect(result.conflicts).toEqual([]);
      expect(result.suggestions).toContain('Add more detail');
    });

    it('should analyze a tool with openai provider', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'openai',
          model: 'gpt-4o-mini',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(8);
      expect(result.completeness_score).toBe(7);
    });

    it('should analyze a tool with ollama provider', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'ollama',
          model: 'llama3.2',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(8);
      expect(result.completeness_score).toBe(7);
    });

    it('should throw for unsupported provider', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      await expect(
        analyzeTool(mockTool, {
          config: {
            enabled: true,
            provider: 'unsupported-provider',
            model: 'some-model',
            timeout: 30000,
          },
        })
      ).rejects.toThrow('Unsupported LLM provider: unsupported-provider');
    });

    it('should handle tool with no parameters', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool({
        inputSchema: { type: 'object', properties: {} },
      });

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBeGreaterThanOrEqual(1);
      expect(result.clarity_score).toBeLessThanOrEqual(10);
    });

    it('should handle tool with complex parameters', async () => {
      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool({
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            limit: { type: 'number', description: 'Max results' },
            filters: { type: 'object', description: 'Filter options' },
          },
          required: ['query'],
        },
      });

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result.ambiguities)).toBe(true);
      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('analyzeTools()', () => {
    it('should export analyzeTools function', async () => {
      const { analyzeTools } = await import('../../../src/llm/analyzer.js');
      expect(typeof analyzeTools).toBe('function');
    });

    it('should analyze multiple tools', async () => {
      const { analyzeTools } = await import('../../../src/llm/analyzer.js');

      const tools = [
        createMockTool({ name: 'tool-one' }),
        createMockTool({ name: 'tool-two' }),
        createMockTool({ name: 'tool-three' }),
      ];

      const results = await analyzeTools(tools, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(3);
      expect(results.has('tool-one')).toBe(true);
      expect(results.has('tool-two')).toBe(true);
      expect(results.has('tool-three')).toBe(true);
    });

    it('should return empty map for empty tools array', async () => {
      const { analyzeTools } = await import('../../../src/llm/analyzer.js');

      const results = await analyzeTools([], {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(0);
    });
  });

  describe('createDefaultLLMConfig()', () => {
    it('should export createDefaultLLMConfig function', async () => {
      const { createDefaultLLMConfig } = await import('../../../src/llm/analyzer.js');
      expect(typeof createDefaultLLMConfig).toBe('function');
    });

    it('should return default config with LLM disabled', async () => {
      const { createDefaultLLMConfig } = await import('../../../src/llm/analyzer.js');
      const config = createDefaultLLMConfig();

      expect(config.enabled).toBe(false);
      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-3-haiku-20240307');
      expect(config.timeout).toBe(30000);
    });
  });

  describe('LLMAnalysisResult validation', () => {
    it('should clamp scores to valid range', async () => {
      // Override the mock to return out-of-range scores
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          clarity_score: 15, // Out of range
          completeness_score: -5, // Out of range
          ambiguities: [],
          conflicts: [],
          suggestions: [],
        }),
      } as never);

      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(10); // Clamped to max
      expect(result.completeness_score).toBe(1); // Clamped to min
    });

    it('should handle missing fields with defaults', async () => {
      // Override the mock to return incomplete response
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          clarity_score: 7,
          // Missing other fields
        }),
      } as never);

      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(7);
      expect(result.completeness_score).toBe(5); // Default
      expect(result.ambiguities).toEqual([]);
      expect(result.conflicts).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      // Override the mock to return markdown-wrapped JSON
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({
        text: '```json\n{"clarity_score": 9, "completeness_score": 8, "ambiguities": [], "conflicts": [], "suggestions": ["Test suggestion"]}\n```',
      } as never);

      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      const result = await analyzeTool(mockTool, {
        config: {
          enabled: true,
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          timeout: 30000,
        },
      });

      expect(result.clarity_score).toBe(9);
      expect(result.completeness_score).toBe(8);
      expect(result.suggestions).toContain('Test suggestion');
    });

    it('should throw error for invalid JSON response', async () => {
      // Override the mock to return invalid response
      const { generateText } = await import('ai');
      vi.mocked(generateText).mockResolvedValueOnce({
        text: 'This is not JSON at all',
      } as never);

      const { analyzeTool } = await import('../../../src/llm/analyzer.js');
      const mockTool = createMockTool();

      await expect(
        analyzeTool(mockTool, {
          config: {
            enabled: true,
            provider: 'anthropic',
            model: 'claude-3-haiku-20240307',
            timeout: 30000,
          },
        })
      ).rejects.toThrow('Failed to parse LLM response');
    });
  });
});
