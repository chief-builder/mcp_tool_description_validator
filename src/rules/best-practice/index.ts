/**
 * Best Practice Rules
 *
 * Rules for recommended tool definition patterns and improvements.
 */

export { default as bp001 } from './bp-001.js';
export { default as bp002 } from './bp-002.js';
export { default as bp003 } from './bp-003.js';
export { default as bp004 } from './bp-004.js';
export { default as bp005 } from './bp-005.js';
export { default as bp006 } from './bp-006.js';
export { default as bp007 } from './bp-007.js';
export { default as bp008 } from './bp-008.js';
export { default as bp009 } from './bp-009.js';

import bp001 from './bp-001.js';
import bp002 from './bp-002.js';
import bp003 from './bp-003.js';
import bp004 from './bp-004.js';
import bp005 from './bp-005.js';
import bp006 from './bp-006.js';
import bp007 from './bp-007.js';
import bp008 from './bp-008.js';
import bp009 from './bp-009.js';
import type { Rule } from '../types.js';

/**
 * All best practice rules.
 */
export const bestPracticeRules: Rule[] = [
  bp001,
  bp002,
  bp003,
  bp004,
  bp005,
  bp006,
  bp007,
  bp008,
  bp009,
];

export default bestPracticeRules;
