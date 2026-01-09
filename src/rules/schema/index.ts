/**
 * Schema Rules Barrel Export
 *
 * Exports all schema validation rules (SCH-001 through SCH-008).
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

export {
  sch001 as SCH_001,
  sch002 as SCH_002,
  sch003 as SCH_003,
  sch004 as SCH_004,
  sch005 as SCH_005,
  sch006 as SCH_006,
  sch007 as SCH_007,
  sch008 as SCH_008,
};

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
];

export default schemaRules;
