import test from 'node:test';
import assert from 'node:assert/strict';
import { csvEscape, glucoseCsv, inRangeAlert, stats, upcomingEvents } from '../server/business.js';

test('statistics ignore absent values and calculate recorded values', () => {
  assert.deepEqual(stats([{ value: 100 }, { value: 140 }, { value: undefined }]), { count: 2, average: 120, minimum: 100, maximum: 140 });
  assert.deepEqual(stats([]), { count: 0, average: null, minimum: null, maximum: null });
});
test('range notices require a complete saved target range', () => {
  assert.equal(inRangeAlert({ id: 'r1', value: 80 }, { lowTarget: null, highTarget: null }), null);
  assert.equal(inRangeAlert({ id: 'r1', value: 110 }, { lowTarget: 80, highTarget: 140 }), null);
  assert.match(inRangeAlert({ id: 'r1', value: 70 }, { lowTarget: 80, highTarget: 140 }).message, /clinician/);
});
test('CSV properly escapes commas, quotes, and line breaks', () => {
  assert.equal(csvEscape('a, "quoted"\nline'), '"a, ""quoted""\nline"');
  assert.match(glucoseCsv([{ measuredAt: '2026-01-01T00:00:00.000Z', value: 120, unit: 'mg/dL', context: 'fasting', note: 'A, B' }]), /"A, B"/);
});
test('upcoming events reflect persisted status rather than duplicating events', () => {
  const now = new Date('2026-10-27T07:00:00.000Z'); const meds = [{ id:'m1', name:'Medication', active:true, startDate:'2026-10-26', times:['08:00'] }];
  const pending = upcomingEvents(meds, [], now); const event = pending.find((x) => x.scheduledAt.startsWith('2026-10-27'));
  const again = upcomingEvents(meds, [{ eventKey:event.eventKey, status:'taken', completedAt:'2026-10-27T08:02:00.000Z' }], now);
  assert.equal(again.find((x) => x.eventKey === event.eventKey).status, 'taken');
});
