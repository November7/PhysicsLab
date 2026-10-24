const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./dom.cjs');
const lab = () => load('magnetic-field.html', 'fieldAt, streamAt, buildContours, clearAll, addConductor, removeSelected, resize, get conductors() { return conductors; }', false);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('right-hand rule, superposition, and stream contours agree with the field', () => {
  const { api } = lab(); api.clearAll(); api.addConductor(450, 200, 1);
  near(api.fieldAt(550, 200).x, 0); near(api.fieldAt(550, 200).y, -0.01);
  const positive = api.buildContours(); assert.ok(positive.length > 0);
  assert.ok(positive.filter(p => p.closed).every(p => p.color === '--field-positive'));
  api.conductors[0].sign = -1;
  near(api.fieldAt(550, 200).y, 0.01);
  const negative = api.buildContours(); assert.equal(negative.length, positive.length);
  assert.ok(negative.filter(p => p.closed).every(p => p.color === '--field-negative'));
  api.addConductor(650, 200, 1);
  const p = { x: 520, y: 250 }, h = 1e-4, b = api.fieldAt(p.x, p.y);
  near(b.x, (api.streamAt(p.x, p.y + h) - api.streamAt(p.x, p.y - h)) / (2 * h));
  near(b.y, -(api.streamAt(p.x + h, p.y) - api.streamAt(p.x - h, p.y)) / (2 * h));
});

test('deleting a held conductor cannot recreate it on pointer release', () => {
  const { api, elements } = lab();
  const canvas = elements.get('fieldCanvas'), c = api.conductors[0];
  const event = { pointerId: 1, clientX: c.x, clientY: c.y, button: 0, isPrimary: true, pointerType: 'mouse', preventDefault() {} };
  canvas.events.pointerdown(event);
  api.removeSelected();
  canvas.events.pointerup(event);
  assert.equal(api.conductors.length, 1);
  assert.ok(!api.conductors.some(item => item.id === c.id));
});

test('duplicate resize notifications do not cancel an active drag', () => {
  const { api, elements } = lab();
  const canvas = elements.get('fieldCanvas'), c = api.conductors[0];
  canvas.events.pointerdown({ pointerId: 1, clientX: c.x, clientY: c.y, button: 0, isPrimary: true, pointerType: 'mouse', preventDefault() {} });
  api.resize(); assert.equal(canvas.capture, 1);
});
