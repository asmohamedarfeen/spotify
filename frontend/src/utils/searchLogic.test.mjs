import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canSearch, normalizeSearchTerm } from './searchLogic.js';

test('normalizeSearchTerm trims repeated whitespace', () => {
  assert.equal(normalizeSearchTerm('  weeknd   remix  '), 'weeknd remix');
});

test('canSearch only allows meaningful terms', () => {
  assert.equal(canSearch(''), false);
  assert.equal(canSearch(' a '), false);
  assert.equal(canSearch('ar'), true);
});
