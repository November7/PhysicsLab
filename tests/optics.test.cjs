const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./dom.cjs');
const lab = () => load('optics.html', 'sims, load, ctl, state, get S() { return S; }');
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.11, `${a} != ${b}`);

test('all outgoing principal rays intersect at the lens or mirror image', () => {
  const { api } = lab();
  for (const i of [2, 3]) for (const sgn of [-1, 1]) for (const x of [5, 12, 30, 85]) {
    api.load(i); const sim = api.sims[i], s = api.S;
    Object.assign(s.p, { x, sgn, f: 12 });
    const g = sim.geo(s), markup = sim.render(s);
    assert.ok(!/NaN|Infinity/.test(markup));
    const lines = [...markup.matchAll(/<line ([^>]*stroke="#2a9d8f"[^>]*)\/>/g)].map(m =>
      Object.fromEntries([...m[1].matchAll(/(x1|x2|y1|y2)="([^"]+)"/g)].map(a => [a[1], +a[2]])));
    assert.ok(lines.length >= 2);
    if (g.inf) {
      const slopes = lines.map(l => (l.y2 - l.y1) / (l.x2 - l.x1));
      slopes.forEach(v => near(v, slopes[0]));
    } else {
      const ix = (i === 3 ? 660 : 450) + (i === 3 ? -1 : 1) * g.y * 5;
      for (const l of lines) near(l.y1 + (l.y2 - l.y1) * (ix - l.x1) / (l.x2 - l.x1), 210 - g.hi * 5);
    }
  }
});

test('Snell law, total internal reflection and normal incidence', () => {
  const { api } = lab(); api.load(1);
  const sim = api.sims[1], s = api.S;
  for (const n1 of [1, 1.5, 2.5]) for (const n2 of [1, 1.5, 2.5]) for (const th of [0, 40, 85]) {
    Object.assign(s.p, { n1, n2, th }); const g = sim.geo(s);
    assert.equal(g.tir, n1 * Math.sin(g.t1) > n2);
    if (!g.tir) near(n1 * Math.sin(g.t1), n2 * Math.sin(g.t2));
    assert.ok(!/NaN|Infinity/.test(sim.render(s)));
    if (th === 0) assert.match(sim.readout(s).status[0], /nie zmienia kierunku/);
  }
});

test('drag belongs to one pointer, uses release coordinates and ends on navigation', () => {
  const { api, elements } = lab(); api.load(2);
  const svg = elements.get('svg');
  const event = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, button: 0, preventDefault() {} });
  svg.events.pointerdown(event(1, 250, 200));
  svg.events.pointermove(event(2, 150, 200));
  assert.equal(api.S.p.x, 40);
  svg.events.pointerup(event(2, 150, 200));
  assert.equal(svg.capture, 1);
  svg.events.pointerup(event(1, 150, 200));
  assert.equal(api.S.p.x, 60); assert.equal(svg.capture, null);
  svg.events.pointerdown(event(1, 150, 200));
  api.load(0); assert.equal(svg.capture, null);
  svg.events.pointermove(event(1, 100, 100)); assert.equal(api.S.p.psi, 35);
});
