/**
 * Rule Loader Tests
 *
 * Tests for rule loading, config-driven disabling, and spec-version gating.
 */

import { describe, it, expect } from 'vitest';
import { loadRules } from '../../../src/core/rule-loader.js';
import { getDefaultRules } from '../../../src/core/config.js';

const FINALIZED_2026_RULES = ['SCH-009', 'SCH-010', 'SEC-011'];

describe('Rule Loader', () => {
  describe('loadRules', () => {
    it('should load all enabled rules', async () => {
      const rules = await loadRules(getDefaultRules());
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should skip rules disabled in config', async () => {
      const rules = await loadRules({ ...getDefaultRules(), 'BP-001': false });
      expect(rules.find((r) => r.id === 'BP-001')).toBeUndefined();
    });

    describe('spec-version gating', () => {
      it('should include finalized rules at the default 2026-07-28 version', async () => {
        const rules = await loadRules(getDefaultRules());
        const ids = rules.map((r) => r.id);
        for (const id of FINALIZED_2026_RULES) {
          expect(ids).toContain(id);
        }
      });

      it('should skip 2026-only rules when 2025-11-25 is passed explicitly', async () => {
        const rules = await loadRules(getDefaultRules(), '2025-11-25');
        const ids = rules.map((r) => r.id);
        for (const id of FINALIZED_2026_RULES) {
          expect(ids).not.toContain(id);
        }
      });

      it('should include finalized rules at the 2026-07-28 version', async () => {
        const rules = await loadRules(getDefaultRules(), '2026-07-28');
        const ids = rules.map((r) => r.id);
        for (const id of FINALIZED_2026_RULES) {
          expect(ids).toContain(id);
        }
      });

      it('should include un-gated rules at every version', async () => {
        for (const version of ['2025-11-25', '2026-07-28']) {
          const rules = await loadRules(getDefaultRules(), version);
          const ids = rules.map((r) => r.id);
          expect(ids).toContain('SCH-001');
          expect(ids).toContain('SEC-001');
          expect(ids).toContain('BP-010');
          expect(ids).toContain('BP-011');
          expect(ids).toContain('BP-012');
        }
      });

      it('should still respect config disabling for 2026-gated rules', async () => {
        const rules = await loadRules(
          { ...getDefaultRules(), 'SCH-010': false },
          '2026-07-28'
        );
        const ids = rules.map((r) => r.id);
        expect(ids).not.toContain('SCH-010');
        expect(ids).toContain('SCH-009');
      });
    });
  });

});
