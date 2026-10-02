/**
 * HTTP Service Tests
 *
 * Tests for the Hono-based HTTP server endpoints.
 */

import { describe, it, expect } from 'vitest';
import { createApp, type LogEntry } from '../../../src/service/server.js';
import { getDefaultConfig } from '../../../src/core/config.js';
import { VERSION } from '../../../src/version.js';

const silent = () => {};

function postJson(app: ReturnType<typeof createApp>, body: unknown) {
  return app.request('/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const simpleTool = {
  name: 'simple-tool',
  description: 'Returns the current status of the example service.',
  inputSchema: { type: 'object', properties: {} },
};

describe('HTTP Service', () => {
  const app = createApp({ logger: silent });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(body.status).toBe('healthy');
      expect(body.version).toBe(VERSION);
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
              description:
                'A test tool for validation testing that performs basic operations.',
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
      const body = (await res.json()) as Record<string, any>;
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
      const body = (await res.json()) as Record<string, any>;
      expect(body.error).toBe('Invalid request: tools array required');
    });

    it('should return 400 when tools is not an array', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, any>;
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
      const body = (await res.json()) as Record<string, any>;
      expect(body).toHaveProperty('valid');
    });

    it('should normalize on/off rule aliases in request configuration', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [
            {
              name: 'check-records',
              description: 'Use this tool when checking records.',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
          config: { rules: { 'LLM-005': 'off' } },
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(
        body.issues.some((issue: { id: string }) => issue.id === 'LLM-005')
      ).toBe(false);
      expect(body.summary.issuesBySeverity).not.toHaveProperty('off');
      expect(body.summary.maturityScore).toEqual(expect.any(Number));
    });

    it('should reject invalid request configuration', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: [],
          config: { rules: { 'LLM-005': 'invalid-severity' } },
        }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, any>;
      expect(body.error).toBe('Invalid request configuration');
      expect(body.message).toContain('Invalid configuration in HTTP request');
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
      const body = (await res.json()) as Record<string, any>;
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
      const body = (await res.json()) as Record<string, any>;
      expect(body.summary.totalTools).toBe(2);
      expect(body.tools).toHaveLength(2);
    });

    it('should return 400 for malformed JSON', async () => {
      const res = await postJson(app, '{ invalid json }');

      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, any>;
      expect(body.error).toBe('Invalid request: malformed JSON');
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
      const body = (await res.json()) as Record<string, any>;
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
      const body = (await res.json()) as Record<string, any>;
      expect(body.metadata).toHaveProperty('validatorVersion');
      expect(body.metadata).toHaveProperty('mcpSpecVersion');
      expect(body.metadata).toHaveProperty('timestamp');
      expect(body.metadata).toHaveProperty('duration');
    });
  });

  describe('request hardening', () => {
    it('should not send CORS headers to cross-origin callers', async () => {
      const res = await app.request('/validate', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.example',
          'Access-Control-Request-Method': 'POST',
        },
      });
      expect(res.headers.get('access-control-allow-origin')).toBeNull();
    });

    it('should reject non-JSON content types with 415', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ tools: [simpleTool] }),
      });
      expect(res.status).toBe(415);
    });

    it('should accept a JSON content type with a charset', async () => {
      const res = await app.request('/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ tools: [simpleTool] }),
      });
      expect(res.status).toBe(200);
    });

    it('should reject bodies over the size limit with 413', async () => {
      const small = createApp({ logger: silent, maxBodyBytes: 200 });
      const res = await postJson(small, {
        tools: [{ ...simpleTool, description: 'x'.repeat(500) }],
      });
      expect(res.status).toBe(413);
    });

    it('should accept bodies within the size limit', async () => {
      const small = createApp({ logger: silent, maxBodyBytes: 10_000 });
      const res = await postJson(small, { tools: [simpleTool] });
      expect(res.status).toBe(200);
    });

    it('should reject more tools than the limit', async () => {
      const limited = createApp({ logger: silent, maxTools: 2 });
      const res = await postJson(limited, {
        tools: [simpleTool, simpleTool, simpleTool],
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, any>;
      expect(body.error).toContain('at most 2 tools');
    });

    it('should accept exactly the tool limit', async () => {
      const limited = createApp({ logger: silent, maxTools: 2 });
      const res = await postJson(limited, { tools: [simpleTool, simpleTool] });
      expect(res.status).toBe(200);
    });

    it.each([null, 'tool', 42, [simpleTool]])(
      'should reject a non-object tool element (%j) with 400',
      async (element) => {
        const res = await postJson(app, { tools: [simpleTool, element] });
        expect(res.status).toBe(400);
        const body = (await res.json()) as Record<string, any>;
        expect(body.error).toBe('Invalid request: tools[1] must be an object');
      }
    );

    it('should reject a non-object request body', async () => {
      const res = await postJson(app, '[1, 2, 3]');
      expect(res.status).toBe(400);
    });

    it('should reject an llm section in request configuration', async () => {
      const res = await postJson(app, {
        tools: [simpleTool],
        config: {
          llm: {
            enabled: true,
            provider: 'anthropic',
            baseUrl: 'http://attacker.example',
          },
        },
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as Record<string, any>;
      expect(body.error).toBe('Invalid request configuration');
      expect(body.message).toContain('llm');
    });

    it('should accept rule, output, spec and profile overrides', async () => {
      const res = await postJson(app, {
        tools: [simpleTool],
        config: {
          rules: { 'SEC-001': 'off' },
          output: { verbose: true },
          specVersion: '2025-11-25',
          profile: 'compliance',
        },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(body.metadata.mcpSpecVersion).toBe('2025-11-25');
      expect(body.metadata.validationProfile).toBe('compliance');
    });

    it('should not search the working directory for config or report its path', async () => {
      // The repository root contains mcp-validate.config.yaml; the service
      // must not pick it up per request or reveal a server path.
      const res = await postJson(app, { tools: [simpleTool] });
      const body = (await res.json()) as Record<string, any>;
      expect(body.metadata.configUsed).toBe('');
    });

    it('should apply the server base config, with request overrides on top', async () => {
      const base = getDefaultConfig();
      base.rules['BP-001'] = false;
      base.profile = 'compliance';
      const configured = createApp({ logger: silent, config: base });

      const res = await postJson(configured, {
        tools: [simpleTool],
        config: { rules: { 'BP-002': false } },
      });
      const body = (await res.json()) as Record<string, any>;
      const ids = body.issues.map((issue: { id: string }) => issue.id);
      expect(ids).not.toContain('BP-001');
      expect(ids).not.toContain('BP-002');
      expect(body.metadata.validationProfile).toBe('compliance');
    });

    it('should log request metadata without bodies or headers', async () => {
      const entries: LogEntry[] = [];
      const logged = createApp({ logger: (entry) => entries.push(entry) });
      await logged.request('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-only-token',
        },
        body: JSON.stringify({
          tools: [{ ...simpleTool, description: 'SENTINEL-DESCRIPTION' }],
        }),
      });

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        level: 'info',
        msg: 'request',
        method: 'POST',
        path: '/validate',
        status: 200,
      });
      const serialized = JSON.stringify(entries);
      expect(serialized).not.toContain('SENTINEL-DESCRIPTION');
      expect(serialized).not.toContain('test-only-token');
    });
  });
});
