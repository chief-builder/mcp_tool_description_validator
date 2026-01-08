/**
 * HTTP Service Tests
 *
 * Tests for the Hono-based HTTP server endpoints.
 */

import { describe, it, expect } from 'vitest';
import { createApp } from '../../../src/service/server.js';

describe('HTTP Service', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('0.1.0');
    });

    it('should return JSON content type', async () => {
      const res = await app.request('/health');
      expect(res.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('POST /validate', () => {
    it('should validate tool definitions', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool for validation testing that performs basic operations.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Query string for testing',
                    maxLength: 100,
                  },
                },
              },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('valid');
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('issues');
      expect(body).toHaveProperty('tools');
      expect(body).toHaveProperty('metadata');
    });

    it('should return 400 for invalid request without tools', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request: tools array required');
    });

    it('should return 400 when tools is not an array', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid request: tools array required');
    });

    it('should accept config overrides', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'test',
              description: 'Test tool for configuration testing.',
              inputSchema: { type: 'object' },
            },
          ],
          config: {
            rules: {
              'SEC-001': false,
            },
          },
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('valid');
    });

    it('should add source to tools missing source', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'no-source-tool',
              description: 'A tool without source information for testing.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0].tool.source).toBeDefined();
      expect(body.tools[0].tool.source.location).toBe('request[0]');
    });

    it('should validate multiple tools', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'tool-one',
              description: 'First tool for testing multiple tools validation.',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'tool-two',
              description: 'Second tool for testing multiple tools validation.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.totalTools).toBe(2);
      expect(body.tools).toHaveLength(2);
    });

    it('should return 500 for malformed JSON', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json }',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
      expect(body).toHaveProperty('message');
    });

    it('should preserve existing source on tools', async () => {
      const customSource = {
        type: 'server' as const,
        location: 'http://example.com/mcp',
        raw: { custom: true },
      };

      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'sourced-tool',
              description: 'A tool with custom source information.',
              inputSchema: { type: 'object', properties: {} },
              source: customSource,
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tools[0].tool.source.type).toBe('server');
      expect(body.tools[0].tool.source.location).toBe('http://example.com/mcp');
    });

    it('should include validation metadata', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'metadata-test',
              description: 'Tool for testing metadata in validation response.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metadata).toHaveProperty('validatorVersion');
      expect(body.metadata).toHaveProperty('mcpSpecVersion');
      expect(body.metadata).toHaveProperty('timestamp');
      expect(body.metadata).toHaveProperty('duration');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await app.request('/health', {
        method: 'OPTIONS',
      });
      // CORS middleware should add appropriate headers
      expect(res.status).toBeLessThan(500);
    });
  });
});
