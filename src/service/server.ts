/**
 * HTTP Service Module
 *
 * Hono-based HTTP server providing REST API endpoints for MCP tool validation.
 * Exposes POST /validate and GET /health endpoints.
 *
 * The service is meant for local or trusted-network use (it has no
 * authentication). Request bodies are untrusted: they are size-limited,
 * must be JSON, and may only override rule and reporting settings.
 */

import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { serve, type ServerType } from '@hono/node-server';
import { validate } from '../core/validator.js';
import { validateRequestConfig, type ConfigOverrides } from '../core/config.js';
import { VERSION } from '../version.js';
import type { ToolDefinition, ValidatorConfig } from '../types/index.js';

/** Default host the service binds to. */
export const DEFAULT_HOST = 'localhost';
/** Default port the service listens on. */
export const DEFAULT_PORT = 8080;
/** Default maximum request body size in bytes (1 MiB). */
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
/** Default maximum number of tool definitions per request. */
export const DEFAULT_MAX_TOOLS = 1000;

/**
 * Request body for the /validate endpoint.
 */
export interface ValidateRequest {
  /** Array of tool definitions to validate */
  tools: ToolDefinition[];
  /** Optional, untrusted configuration overrides supplied in the request. */
  config?: unknown;
}

/** A structured log entry. Never contains request bodies or headers. */
export interface LogEntry {
  level: 'info' | 'error';
  msg: string;
  [key: string]: unknown;
}

/** Receives structured log entries from the service. */
export type Logger = (entry: LogEntry) => void;

/** Default logger: one JSON object per line on stdout/stderr. */
export const jsonLineLogger: Logger = (entry) => {
  const line = JSON.stringify({ time: new Date().toISOString(), ...entry });
  if (entry.level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
};

/** Options for creating the HTTP application. */
export interface CreateAppOptions {
  /**
   * Server-side base configuration, resolved once at startup. Requests
   * overlay their own overrides on top of it. When omitted, the built-in
   * defaults are used; the working directory is never searched per request.
   */
  config?: ValidatorConfig;
  /** Maximum request body size in bytes. */
  maxBodyBytes?: number;
  /** Maximum number of tool definitions per request. */
  maxTools?: number;
  /** Structured logger (defaults to JSON lines on stdout/stderr). */
  logger?: Logger;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Overlay request overrides on the server's base configuration. The base
 * `llm` section is kept; requests cannot supply one.
 */
function mergeRequestConfig(
  base: ValidatorConfig | undefined,
  overrides: ConfigOverrides | undefined
): ConfigOverrides | undefined {
  if (!base) return overrides;
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    rules: { ...base.rules, ...(overrides.rules ?? {}) },
    output: { ...base.output, ...(overrides.output ?? {}) },
    llm: base.llm,
  };
}

/**
 * Create and configure the Hono application.
 *
 * @returns Configured Hono application with /health and /validate
 */
export function createApp(options: CreateAppOptions = {}) {
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const maxTools = options.maxTools ?? DEFAULT_MAX_TOOLS;
  const log = options.logger ?? jsonLineLogger;

  const app = new Hono();

  // Request log: method, path, status and duration only.
  app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    log({
      level: 'info',
      msg: 'request',
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    });
  });

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      version: VERSION,
    });
  });

  // Validation endpoint
  app.post(
    '/validate',
    bodyLimit({
      maxSize: maxBodyBytes,
      onError: (c) =>
        c.json({ error: `Request body exceeds ${maxBodyBytes} bytes` }, 413),
    }),
    async (c) => {
      // Requiring JSON also forces a CORS preflight for cross-origin
      // browser requests, which this service does not answer.
      const contentType = c.req.header('content-type') ?? '';
      if (!contentType.toLowerCase().startsWith('application/json')) {
        return c.json({ error: 'Content-Type must be application/json' }, 415);
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid request: malformed JSON' }, 400);
      }

      if (!isPlainObject(body) || !Array.isArray(body.tools)) {
        return c.json({ error: 'Invalid request: tools array required' }, 400);
      }
      const tools: unknown[] = body.tools;
      if (tools.length > maxTools) {
        return c.json(
          { error: `Invalid request: at most ${maxTools} tools per request` },
          400
        );
      }
      const badIndex = tools.findIndex((tool) => !isPlainObject(tool));
      if (badIndex !== -1) {
        return c.json(
          { error: `Invalid request: tools[${badIndex}] must be an object` },
          400
        );
      }

      let overrides: ConfigOverrides | undefined;
      try {
        overrides =
          body.config === undefined
            ? undefined
            : validateRequestConfig(body.config);
      } catch (error) {
        return c.json(
          {
            error: 'Invalid request configuration',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          400
        );
      }

      // Add source to tools if missing
      const toolsWithSource = (tools as ToolDefinition[]).map(
        (tool, index) => ({
          ...tool,
          source: tool.source || {
            type: 'file' as const,
            location: `request[${index}]`,
            raw: tool,
          },
        })
      );

      try {
        const result = await validate(toolsWithSource, {
          config: mergeRequestConfig(options.config, overrides),
          discoverConfig: false,
        });
        return c.json(result);
      } catch (error) {
        // Log the detail server-side; do not echo internals to the caller.
        log({
          level: 'error',
          msg: 'validation failed',
          error: error instanceof Error ? error.message : String(error),
        });
        return c.json({ error: 'Validation failed' }, 500);
      }
    }
  );

  return app;
}

/** Options for starting the HTTP service programmatically. */
export interface StartServerOptions extends CreateAppOptions {
  /** Port number to listen on. */
  port?: number;
  /** Hostname to bind to. */
  host?: string;
}

/** Start the HTTP service using an options object. */
export function startServer(options?: StartServerOptions): ServerType;
/** Start the HTTP service using positional port and hostname arguments. */
export function startServer(port?: number, hostname?: string): ServerType;
export function startServer(
  optionsOrPort: StartServerOptions | number = {},
  positionalHostname?: string
): ServerType {
  const options: StartServerOptions =
    typeof optionsOrPort === 'number'
      ? { port: optionsOrPort, host: positionalHostname }
      : optionsOrPort;
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const log = options.logger ?? jsonLineLogger;
  const app = createApp(options);

  return serve({ fetch: app.fetch, port, hostname: host }, (info) => {
    log({
      level: 'info',
      msg: 'listening',
      url: `http://${host}:${info.port}`,
      version: VERSION,
    });
  });
}
