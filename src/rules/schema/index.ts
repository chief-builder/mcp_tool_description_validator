/**
 * Schema Rules Barrel Export
 *
 * Exports all schema validation rules (SCH-001 through SCH-011).
 */

import type { Rule } from '../types.js';

import sch001 from './sch-001.js';
import sch002 from './sch-002.js';
import sch003 from './sch-003.js';
import sch004 from './sch-004.js';
import sch005 from './sch-005.js';
import sch006 from './sch-006.js';
import sch007 from './sch-007.js';
import sch008 from './sch-008.js';
import sch009 from './sch-009.js';
import sch010 from './sch-010.js';
import sch011 from './sch-011.js';

/**
 * All schema rules as an array.
 */
export const schemaRules: Rule[] = [
  sch001,
  sch002,
  sch003,
  sch004,
  sch005,
  sch006,
  sch007,
  sch008,
  sch009,
  sch010,
  sch011,
];

export default schemaRules;
