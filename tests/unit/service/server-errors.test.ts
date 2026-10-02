/**
 * HTTP Service error-path tests.
 *
 * Kept separate because the validator module is mocked to throw.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/core/validator.js', () => ({
  validate: vi.fn(async () => {
    throw new Error('internal detail /srv/secret/path');
  }),
}));

const { createApp } = await import('../../../src/service/server.js');
import type { LogEntry } from '../../../src/service/server.js';

describe('HTTP Service internal errors', () => {
  it('should return a generic 500 and log the detail server-side', async () => {
    const entries: LogEntry[] = [];
    const app = createApp({ logger: (entry) => entries.push(entry) });

    const res = await app.request('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tools: [{ name: 'x', inputSchema: { type: 'object' } }],
      }),
    });

    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'Validation failed' });
    expect(text).not.toContain('/srv/secret/path');

    const errorEntry = entries.find((entry) => entry.level === 'error');
    expect(errorEntry?.error).toContain('internal detail');
  });
});
