import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTriage } from './triage.js';

test('flags chest pain with breathing difficulty as an emergency', () => {
  const result = assessTriage('I have chest pain and trouble breathing');
  assert.equal(result.level, 'EMERGENCY');
  assert.equal(result.emergency, true);
});

test('routes high fever to same-day care', () => {
  const result = assessTriage('I have a high fever since last night');
  assert.equal(result.level, 'URGENT');
  assert.equal(result.emergency, false);
});

test('keeps ordinary concerns in guided check-in', () => {
  assert.equal(assessTriage('I have a mild headache').level, 'ROUTINE');
});
