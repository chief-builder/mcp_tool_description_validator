/**
 * Rule Loader Tests
 *
 * Tests for rule loading, config-driven disabling, and spec-version gating.
 */

import { describe, it, expect } from 'vitest';
import { loadRules, getEffectiveSeverity } from '../../../src/core/rule-loader.js';
import { getDefaultRules } from '../../../src/core/config.js';

const DRAFT_ONLY_RULES = ['SCH-009', 'SCH-010', 'SEC-011'];

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
      it('should skip draft-gated rules at the default (2025-11-25) version', async () => {
        const rules = await loadRules(getDefaultRules());
        const ids = rules.map((r) => r.id);
        for (const draftId of DRAFT_ONLY_RULES) {
          expect(ids).not.toContain(draftId);
        }
      });

      it('should skip draft-gated rules when 2025-11-25 is passed explicitly', async () => {
        const rules = await loadRules(getDefaultRules(), '2025-11-25');
        const ids = rules.map((r) => r.id);
        for (const draftId of DRAFT_ONLY_RULES) {
          expect(ids).not.toContain(draftId);
        }
      });

      it('should include draft-gated rules at the draft version', async () => {
        const rules = await loadRules(getDefaultRules(), 'draft');
        const ids = rules.map((r) => r.id);
        for (const draftId of DRAFT_ONLY_RULES) {
          expect(ids).toContain(draftId);
        }
      });

      it('should include un-gated rules at every version', async () => {
        for (const version of ['2025-11-25', 'draft']) {
          const rules = await loadRules(getDefaultRules(), version);
          const ids = rules.map((r) => r.id);
          expect(ids).toContain('SCH-001');
          expect(ids).toContain('SEC-001');
          expect(ids).toContain('BP-010');
          expect(ids).toContain('BP-011');
          expect(ids).toContain('BP-012');
        }
      });

      it('should still respect config disabling for draft-gated rules', async () => {
        const rules = await loadRules(
          { ...getDefaultRules(), 'SCH-010': false },
          'draft'
        );
        const ids = rules.map((r) => r.id);
        expect(ids).not.toContain('SCH-010');
        expect(ids).toContain('SCH-009');
      });
    });
  });

  describe('getEffectiveSeverity', () => {
    it('should use the default severity when config just enables the rule', async () => {
      const rules = await loadRules(getDefaultRules(), 'draft');
      const rule = rules.find((r) => r.id === 'SCH-010');
      expect(rule).toBeDefined();
      expect(getEffectiveSeverity(rule!, { 'SCH-010': true })).toBe('error');
    });

    it('should apply a config severity override', async () => {
      const rules = await loadRules(getDefaultRules(), 'draft');
      const rule = rules.find((r) => r.id === 'SCH-010');
      expect(getEffectiveSeverity(rule!, { 'SCH-010': 'warning' })).toBe('warning');
    });
  });
});
