/**
 * HTTP Service Module
 *
 * Hono-based HTTP server providing REST API endpoints for MCP tool validation.
 * Exposes POST /validate and GET /health endpoints.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { validate } from '../core/validator.js';
import type { ToolDefinition, ValidatorConfig } from '../types/index.js';

const VERSION = '0.1.0';

/**
 * Request body for the /validate endpoint.
 */
export interface ValidateRequest {
  /** Array of tool definitions to validate */
  tools: ToolDefinition[];
  /** Optional configuration overrides */
  config?: Partial<ValidatorConfig>;
}

/**
 * Create and configure the Hono application.
 *
 * Returns a configured Hono app with CORS, logging middleware,
 * and the /health and /validate endpoints.
 *
 * @returns Configured Hono application
 */
export function createApp() {
  const app = new Hono();

  // Middleware
  app.use('*', cors());
  app.use('*', logger());

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: VERSION,
    });
  });

  // Validation endpoint
  app.post('/validate', async (c) => {
    try {
      const body = await c.req.json<ValidateRequest>();

      if (!body.tools || !Array.isArray(body.tools)) {
        return c.json({ error: 'Invalid request: tools array required' }, 400);
      }

      // Add source to tools if missing
      const toolsWithSource = body.tools.map((tool, index) => ({
        ...tool,
        source: tool.source || {
          type: 'file' as const,
          location: `request[${index}]`,
          raw: tool,
        },
      }));

      const result = await validate(toolsWithSource, {
        config: body.config,
      });

      return c.json(result);
    } catch (error) {
      return c.json(
        {
          error: 'Validation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });

  return app;
}

/**
 * Start the HTTP server on the specified port.
 *
 * Note: For production deployment, use @hono/node-server with serve().
 * This function returns the app for testing purposes.
 *
 * @param port - Port number to listen on (default: 8080)
 * @returns The configured Hono application
 */
export function startServer(port: number = 8080) {
  const app = createApp();

  console.log(`Starting MCP Tool Validator service on port ${port}`);

  // For Node.js deployment, use @hono/node-server:
  // import { serve } from '@hono/node-server';
  // serve({ fetch: app.fetch, port });

  return app;
}

// Export app instance for testing
export const app = createApp();
