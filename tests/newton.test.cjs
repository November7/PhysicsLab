const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Execute the actual inline script with a minimal DOM. No production test hooks.
function lab() {
  class Element {
    constructor() { this.children = new Map(); this.events = {}; this.classList = { toggle() {} }; }
    querySelector(selector) {
      if (!this.children.has(selector)) this.children.set(selector, new Element());
      return this.children.get(selector);
    }
    addEventListener(name, fn) { this.events[name] = fn; }
    appendChild() {}
    setAttribute(name, value) { this[name] = value; }
    setPointerCapture(id) { this.capture = id; }
    releasePointerCapture() { this.capture = null; }
    hasPointerCapture(id) { return this.capture === id; }
    getScreenCTM() { return { inverse: () => ({ scale: 2, x: 100, y: 200 }) }; }
    style = {};
  }
  const elements = new Map();
  const document = {
    hidden: false,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement: () => new Element(),
    querySelectorAll: () => []
  };
  const html = readFileSync(join(__dirname, '..', 'newton.html'), 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  class DOMPoint {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(matrix) { return { x: (this.x - matrix.x) * matrix.scale, y: (this.y - matrix.y) * matrix.scale }; }
  }
  const context = vm.createContext({ document, DOMPoint, performance: { now: () => 0 }, requestAnimationFrame() {} });
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.lab = { sims, load, arrow, state, frame, ctl, scene, get S() { return S; } };})();'), context);
  return { ...context.lab, api: context.lab, elements, document };
}

function near(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function advance(sim, s, duration, dt = 0.037) {
  const end = s.t + duration;
  while (s.t < end - 1e-10) {
    const h = Math.min(dt, end - s.t);
    s.t += sim.step(s, h) ?? h;
    if (s.landed) break;
  }
}

function boundedVectors(markup) {
  assert.ok(!/NaN|Infinity/.test(markup));
  const centers = [...markup.matchAll(/<circle class="mass-center" cx="([^"]+)" cy="([^"]+)"/g)].map(m => [+m[1], +m[2]]);
  for (const match of markup.matchAll(/<line ([^>]*marker-end[^>]*)\/>/g)) {
    const attrs = Object.fromEntries([...match[1].matchAll(/(x1|x2|y1|y2)="([^"]+)"/g)].map(m => [m[1], Number(m[2])]));
    for (const key of ['x1', 'x2']) assert.ok(attrs[key] >= 18 && attrs[key] <= 882, `${key}: ${attrs[key]}`);
    for (const key of ['y1', 'y2']) assert.ok(attrs[key] >= 18 && attrs[key] <= 382, `${key}: ${attrs[key]}`);
    assert.ok(Math.hypot(attrs.x2 - attrs.x1, attrs.y2 - attrs.y1) <= 200.000001);
    if (/marker-end="url\(#m-(F|T|Q|N)\)"/.test(match[1])) {
      assert.ok(centers.some(([x, y]) => Math.abs(x - attrs.x1) < 1e-8 && Math.abs(y - attrs.y1) < 1e-8), 'force must start at a marked center of mass');
    }
  }
}

test('initialization, all scenes, and extreme vector lengths', () => {
  const { api } = lab();
  for (let i = 0; i < api.sims.length; i++) {
    api.load(i);
    const sim = api.sims[i], s = api.S;
    for (const c of sim.controls) s.p[c.id] = c.options ? c.options[0].value : c.max;
    sim.reset(s);
    if (i === 0) s.push = { F: 50, left: 1 };
    if (i === 2) s.launched = true;
    boundedVectors(sim.render(s));
    advance(sim, s, 120);
    boundedVectors(sim.render(s));
    assert.ok(!/NaN|Infinity/.test(sim.readout(s).eq));
  }
  const markup = api.arrow(850, 350, 10850, 20350, 'v', 'v = 99999 m/s');
  boundedVectors(markup);
  const end = [...markup.matchAll(/(?:x2|y2)="([^"]+)"/g)].map(m => +m[1]);
  near((end[1] - 350) / (end[0] - 850), 2);
  api.state.showVectors = false;
  assert.equal(api.arrow(450, 200, 650, 200, 'v', 'v'), '');
});

test('impulse duration is exact, including a partial last step', () => {
  const { api } = lab(), s = api.S, sim = api.sims[0];
  s.p.m = 2; s.push = { F: 30, left: 0.3 };
  advance(sim, s, 1);
  near(s.v, 4.5);
  near(s.x, 0.5 * 15 * 0.3 ** 2 + 4.5 * 0.7);
  assert.equal(sim.calc(s).F, 0);
});

test('static friction, stopping distance, and force reversal', () => {
  const { api } = lab(); api.load(1);
  const s = api.S, sim = api.sims[1];
  Object.assign(s.p, { m: 2, F: 5, mu: 0.6 });
  advance(sim, s, 1);
  near(s.v, 0); near(s.x, 0);
  sim.render(s); near(s.net, 0); near(s.T, -5);
  s.p.F = 0; s.v = 3;
  advance(sim, s, 2);
  near(s.v, 0); near(s.x, 9 / (2 * 0.6 * 9.81));
  sim.reset(s); s.v = 1; s.p.F = -30;
  const stop = 1 / (15 + 0.6 * 9.81);
  advance(sim, s, 1);
  near(s.v, (-15 + 0.6 * 9.81) * (1 - stop));
  near(s.x, stop / 2 + 0.5 * (-15 + 0.6 * 9.81) * (1 - stop) ** 2);
});

test('force and acceleration readouts update while paused', () => {
  const { api, elements } = lab(); api.load(1);
  api.ctl.mu.input.events.input({ target: { value: '0' } });
  api.ctl.F.input.events.input({ target: { value: '-50' } });
  near(api.S.a, -12.5); near(api.S.net, -50);
  elements.get('btn-start').events.click();
  api.frame(50);
  elements.get('btn-run').events.click();
  const time = api.S.t, x = api.S.x;
  api.frame(100);
  near(api.S.t, time); near(api.S.x, x);
  elements.get('btn-run').events.click(); api.frame(150);
  assert.ok(api.S.t > time);
  elements.get('btn-stop').events.click(); api.frame(200);
  assert.equal(api.state.mode, 'stopped');
  elements.get('btn-reset').events.click(); near(api.S.t, 0); near(api.S.v, 0);
});

test('two carts conserve momentum and remain in view after a long run', () => {
  const { api } = lab(); api.load(2);
  const sim = api.sims[2], s = api.S;
  Object.assign(s.p, { m1: 0.5, m2: 10, F: 50, T: 1.5 });
  sim.reset(s); s.launched = true;
  advance(sim, s, 300, 0.1);
  near(s.v1, -150); near(s.v2, 7.5);
  near(s.p.m1 * s.v1 + s.p.m2 * s.v2, 0);
  assert.equal(sim.active(s), false);
  const k = sim.scale(s);
  for (const x of [s.x1, s.x2]) assert.ok(450 + x * k >= 160 && 450 + x * k <= 740);
  boundedVectors(sim.render(s));
  assert.match(sim.readout(s).eq, /a₁ = <span class="num">0,00/);
});

test('projectile range, peak, energy and exact landing for boundary settings', () => {
  const { api } = lab(); api.load(3);
  const sim = api.sims[3], s = api.S;
  for (const v0 of [1, 18, 40]) for (const angle of [0, 1, 45, 89, 90]) for (const h0 of [0, 2, 20]) {
    Object.assign(s.p, { v0, angle, h0 }); sim.reset(s);
    const flight = sim.flight(s), peakTime = flight.vy / 9.81;
    if (peakTime > 0) {
      s.t += sim.step(s, peakTime);
      near(s.y, flight.peak); near(s.vy, 0);
      near((s.vx ** 2 + s.vy ** 2) / 2 + 9.81 * s.y, v0 ** 2 / 2 + 9.81 * h0);
    }
    boundedVectors(sim.render(s));
    s.t += sim.step(s, flight.duration + 1);
    near(s.t, flight.duration); near(s.x, flight.range); near(s.y, 0);
    near(s.vx, 0); near(s.vy, 0); assert.equal(s.landed, true);
    boundedVectors(sim.render(s));
    if (angle === 90) near(s.x, 0);
    if (angle === 45 && h0 === 0) near(s.x, v0 ** 2 / 9.81);
  }
});

test('projectile frame stops at impact; parameter change prepares a new launch', () => {
  const { api, elements } = lab(); api.load(3);
  api.ctl.v0.input.events.input({ target: { value: '1' } });
  api.ctl.h0.input.events.input({ target: { value: '0' } });
  elements.get('btn-start').events.click();
  for (let t = 50; t <= 1000; t += 50) api.frame(t);
  near(api.S.t, api.sims[3].flight(api.S).duration);
  assert.equal(api.state.mode, 'stopped');
  api.ctl.h0.input.events.input({ target: { value: '20' } });
  assert.equal(api.state.mode, 'idle'); near(api.S.t, 0); near(api.S.y, 20);
  assert.equal(api.S.landed, false);
});

function pointer(svg, type, x, y, id = 1) {
  svg.events[type]({ clientX: 100 + x / 2, clientY: 200 + y / 2, pointerId: id, button: 0, preventDefault() {} });
}

test('three laws group projectile and block under the second law', () => {
  const { api, elements } = lab();
  const lessons = elements.get('lessons'), example = elements.get('example');
  assert.equal((lessons.innerHTML.match(/class="lesson"/g) || []).length, 3);
  const chooseLaw = i => lessons.events.click({ target: { closest: () => ({ dataset: { i: String(i) } }) } });
  chooseLaw(1);
  assert.equal((example.innerHTML.match(/<option/g) || []).length, 2);
  assert.match(example.innerHTML, /Klocek/); assert.match(example.innerHTML, /Rzut ukośny/);
  example.events.change({ target: { value: '3' } });
  assert.equal(elements.get('bench-label').textContent, 'II zasada dynamiki');
  assert.ok(api.S.p.v0);
  chooseLaw(2); assert.ok(api.S.p.m1); assert.equal(example.disabled, false);
  assert.equal((example.innerHTML.match(/<option/g) || []).length, 2);
  assert.match(example.innerHTML, /Zderzenie bloków/);
  example.events.change({ target: { value: '4' } });
  assert.equal(elements.get('bench-label').textContent, 'III zasada dynamiki');
  assert.ok(api.S.contact);
  chooseLaw(0); assert.equal(example.disabled, true);
  chooseLaw(2); assert.equal(example.value, '4');
  chooseLaw(1); assert.ok(api.S.p.v0); assert.equal(example.value, '3');
});

test('dragging sets launch angle and speed, keeps the anchor fixed and launches on release', () => {
  const { api, elements } = lab(); api.load(3);
  const sim = api.sims[3], s = api.S, svg = elements.get('svg');
  const k = sim.scale(s), x = 90, y = 310 - s.p.h0 * k;
  pointer(svg, 'pointerdown', x, y);
  near(s.p.v0, 18); near(s.p.angle, 45);
  pointer(svg, 'pointermove', x + 100, y - 100);
  near(s.p.angle, 45); near(s.p.v0, 28.5); near(sim.scale(s), k);
  near(+api.ctl.v0.input.value, 28.5); near(+api.ctl.angle.input.value, 45);
  assert.match(api.scene.innerHTML, /v₀ = 28,5/);
  boundedVectors(api.scene.innerHTML);
  api.frame(50); near(s.t, 0);
  pointer(svg, 'pointerup', x + 100, y - 100);
  assert.equal(api.state.mode, 'running'); assert.equal(s.drag, null);
  api.frame(100); assert.ok(s.t > 0); assert.ok(s.x > 0);
  near(s.vx, 28.5 / Math.sqrt(2));
  assert.equal(sim.hit(s, { x, y }), false);
});

test('click and cancelled gestures do not launch; another pointer cannot cancel a drag', () => {
  const { api, elements } = lab(); api.load(3);
  const sim = api.sims[3], s = api.S, svg = elements.get('svg');
  const x = 90, y = 310 - s.p.h0 * sim.scale(s);
  pointer(svg, 'pointerdown', x + 15, y);
  pointer(svg, 'pointerup', x + 15, y);
  assert.equal(api.state.mode, 'idle'); near(s.p.v0, 18);
  pointer(svg, 'pointerdown', x, y);
  pointer(svg, 'pointermove', x, y - 200);
  near(s.p.v0, 40); near(s.p.angle, 90);
  pointer(svg, 'pointercancel', x, y - 200, 2);
  assert.ok(s.drag);
  pointer(svg, 'pointercancel', x, y - 200);
  assert.equal(s.drag, null); assert.equal(api.state.mode, 'idle');
  near(s.p.v0, 18); near(s.p.angle, 45);
  near(+api.ctl.v0.input.value, 18);
  pointer(svg, 'pointerdown', x, y);
  pointer(svg, 'pointermove', x - 100, y + 100);
  pointer(svg, 'pointerup', x - 100, y + 100);
  assert.equal(api.state.mode, 'idle'); near(s.p.v0, 18);
});

test('drag limits, final release position, reset and navigation during a gesture', () => {
  const { api, elements } = lab(); api.load(3);
  const sim = api.sims[3], svg = elements.get('svg');
  api.ctl.h0.input.events.input({ target: { value: '20' } });
  const x = 90, y = 310 - api.S.p.h0 * sim.scale(api.S);
  api.state.showVectors = false;
  pointer(svg, 'pointerdown', x, y);
  pointer(svg, 'pointermove', x + 5000, y);
  near(api.S.p.v0, 40); near(api.S.p.angle, 0);
  boundedVectors(api.scene.innerHTML);
  assert.match(api.scene.innerHTML, /marker-end/); // Aiming remains visible.
  // Use the pointerup coordinates even without a matching final pointermove.
  pointer(svg, 'pointerup', x, y - 200);
  near(api.S.p.angle, 90); near(api.S.vx, 0); near(api.S.vy, 40);
  assert.equal(api.state.mode, 'running');
  elements.get('btn-reset').events.click();
  let originY = 310 - api.S.p.h0 * sim.scale(api.S);
  pointer(svg, 'pointerdown', x, originY);
  pointer(svg, 'pointermove', x + 60, originY - 60);
  api.ctl.angle.input.value = '30';
  api.ctl.angle.input.events.input({ target: api.ctl.angle.input });
  near(api.S.p.angle, 30); assert.equal(api.S.drag, null);
  originY = 310 - api.S.p.h0 * sim.scale(api.S);
  pointer(svg, 'pointerdown', x, originY);
  pointer(svg, 'pointermove', x + 60, originY - 60);
  api.load(1);
  pointer(svg, 'pointerup', x + 60, originY - 60);
  assert.equal(api.state.mode, 'idle'); assert.equal(api.S.p.F, 20);
});

test('first law has no friction setting and coasts at constant speed after a push', () => {
  const { api } = lab(), s = api.S, sim = api.sims[0];
  assert.equal(api.ctl.mu, undefined); assert.equal(s.p.mu, undefined);
  assert.ok(!sim.controls.some(c => c.id === 'mu'));
  s.push = { F: -20, left: 0.4 };
  assert.match(sim.readout(s).status[0], /Przygotowanie.*II zasada/);
  advance(sim, s, 1);
  const velocity = s.v, position = s.x;
  advance(sim, s, 60);
  near(s.v, velocity); near(s.x, position + velocity * 60);
  near(sim.calc(s).a, 0); near(sim.calc(s).net, 0);
  assert.match(sim.readout(s).status[0], /I zasada:.*v = const/);
  assert.match(sim.render(s), /lód, brak tarcia/);
  api.load(1); assert.ok(api.ctl.mu);
});

test('elastic collision exchanges velocities of equal masses, with no force outside contact', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  Object.assign(s.p, { m1: 2, m2: 2, u1: 3, u2: -1 }); sim.reset(s);
  near(s.contact.at, 1.2);
  advance(sim, s, 1); near(s.force, 0); near(s.v1, 3); near(s.v2, -1);
  advance(sim, s, 2, 1); // Deliberately step across the entire collision.
  assert.equal(s.phase, 'after'); near(s.v1, -1); near(s.v2, 3); near(s.force, 0);
  near(s.elasticEnergy, 0);
});

test('collision conserves momentum and total energy throughout contact at extreme settings', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  for (const m1 of [0.5, 2, 10]) for (const m2 of [0.5, 4, 10]) {
    for (const [u1, u2] of [[6, -6], [3, 0], [-1, -3], [3, 2.5]]) {
      Object.assign(s.p, { m1, m2, u1, u2 }); sim.reset(s);
      const momentum = m1 * u1 + m2 * u2, energy = (m1 * u1 ** 2 + m2 * u2 ** 2) / 2;
      for (const fraction of [0, 0.1, 0.5, 0.9, 1, 2]) {
        const t = s.contact.at + fraction * s.contact.duration;
        sim.evaluate(s, t);
        near(m1 * s.v1 + m2 * s.v2, momentum);
        near((m1 * s.v1 ** 2 + m2 * s.v2 ** 2) / 2 + s.elasticEnergy, energy);
        assert.ok(s.x2 - s.x1 >= 0.7 - 1e-8, 'cart bodies must not overlap');
        const sample = sim.sample(s); near(sample.F1 + sample.F2, 0);
        boundedVectors(sim.render(s));
      }
      near(s.v1, ((m1 - m2) * u1 + 2 * m2 * u2) / (m1 + m2));
      near(s.v2, (2 * m1 * u1 + (m2 - m1) * u2) / (m1 + m2));
    }
  }
});

test('contact force agrees with acceleration and force vectors have equal length', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  const t = s.contact.at + s.contact.duration / 2, h = 1e-6;
  sim.evaluate(s, t - h); const before = [s.v1, s.v2];
  sim.evaluate(s, t + h); const after = [s.v1, s.v2];
  sim.evaluate(s, t);
  near((after[0] - before[0]) / (2 * h), -s.force / s.p.m1, 1e-6);
  near((after[1] - before[1]) / (2 * h), s.force / s.p.m2, 1e-6);
  assert.ok(s.force > 0);
  const markup = sim.render(s), lengths = [];
  for (const line of markup.matchAll(/<line ([^>]*marker-end="url\(#m-F\)"[^>]*)\/>/g)) {
    const coords = Object.fromEntries([...line[1].matchAll(/(x1|x2)="([^"]+)"/g)].map(m => [m[1], +m[2]]));
    lengths.push(coords.x2 - coords.x1);
  }
  assert.equal(lengths.length, 2); near(lengths[0] + lengths[1], 0);
  assert.ok(lengths[0] < 0); assert.ok(lengths[1] > 0);
});

test('equal or separating velocities never collide and carts stay in frame', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  for (const [u1, u2] of [[0, 0], [6, 6], [-6, 6], [-6, -5]]) {
    Object.assign(s.p, { u1, u2 }); sim.reset(s); advance(sim, s, 300, 0.1);
    assert.equal(s.phase, 'apart'); near(s.force, 0); near(s.v1, u1); near(s.v2, u2);
    const { center, k } = sim.camera(s);
    for (const x of [s.x1, s.x2]) assert.ok(450 + (x - center) * k >= 150 && 450 + (x - center) * k <= 750);
    boundedVectors(sim.render(s));
    assert.match(sim.readout(s).status[0], /Brak zderzenia/);
  }
});

test('collision integrates with graphs, pause, reset and parameter changes', () => {
  const { api, elements } = lab(); api.load(4);
  elements.get('view-graph').events.click();
  assert.match(api.scene.innerHTML, /Siła kontaktu F/);
  elements.get('btn-start').events.click();
  for (let t = 50; t <= 2000; t += 50) api.frame(t);
  assert.ok(api.S.hist.some(p => p.F1 < 0 && p.F2 > 0));
  assert.ok(!/NaN|Infinity/.test(api.scene.innerHTML));
  elements.get('btn-run').events.click();
  const t = api.S.t, x = api.S.x1;
  api.frame(2050); near(api.S.t, t); near(api.S.x1, x);
  elements.get('btn-reset').events.click();
  near(api.S.t, 0); near(api.S.x1, -3); near(api.S.force, 0);
  assert.equal(api.S.hist.length, 0);
  api.ctl.u2.input.events.input({ target: { value: '6' } });
  assert.equal(api.state.mode, 'idle'); assert.equal(api.S.phase, 'apart');
  elements.get('view-sim').events.click(); boundedVectors(api.scene.innerHTML);
});

test('all restitution values preserve momentum and account for dissipated energy', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  for (const e of [0, 0.05, 0.5, 0.95, 1]) for (const m1 of [0.5, 10]) for (const m2 of [0.5, 10]) {
    for (const [u1, u2] of [[6, -6], [3, 0], [-1, -3]]) {
      Object.assign(s.p, { e, m1, m2, u1, u2 }); sim.reset(s);
      const momentum = m1 * u1 + m2 * u2;
      const energy = (m1 * u1 ** 2 + m2 * u2 ** 2) / 2;
      const loss = m1 * m2 / (m1 + m2) * (1 - e ** 2) * (u1 - u2) ** 2 / 2;
      let previousLoss = 0;
      for (const fraction of [0, 0.1, 0.49, 0.5, 0.51, 0.9, 1, 2, 100]) {
        sim.evaluate(s, s.contact.at + fraction * s.contact.duration);
        near(m1 * s.v1 + m2 * s.v2, momentum);
        near((m1 * s.v1 ** 2 + m2 * s.v2 ** 2) / 2 + s.elasticEnergy + s.dissipatedEnergy, energy);
        assert.ok(s.dissipatedEnergy >= previousLoss - 1e-8);
        previousLoss = s.dissipatedEnergy;
        assert.ok(s.x2 - s.x1 >= 0.7 - 1e-8);
        boundedVectors(sim.render(s));
      }
      near(s.v2 - s.v1, e * (u1 - u2));
      near(s.dissipatedEnergy, loss);
      if (e === 0) {
        near(s.v1, momentum / (m1 + m2)); near(s.v2, s.v1);
        const separation = s.x2 - s.x1;
        sim.evaluate(s, s.contact.at + s.contact.duration + 1000);
        near(s.x2 - s.x1, separation);
        assert.match(sim.render(s), /Połączone bloki/);
      }
    }
  }
});

test('forces in inelastic compression and rebound agree with acceleration', () => {
  const { api } = lab(); api.load(4);
  const sim = api.sims[4], s = api.S;
  for (const e of [0, 0.1, 0.5, 1]) {
    s.p.e = e; sim.reset(s);
    for (const fraction of [0.2, 0.8]) {
      const t = s.contact.at + fraction * s.contact.duration, h = 1e-6;
      sim.evaluate(s, t - h); const before = [s.v1, s.v2];
      sim.evaluate(s, t + h); const after = [s.v1, s.v2];
      sim.evaluate(s, t);
      near((after[0] - before[0]) / (2 * h), -s.force / s.p.m1, 1e-6);
      near((after[1] - before[1]) / (2 * h), s.force / s.p.m2, 1e-6);
    }
  }
});

function bodyRects(markup) {
  return [...markup.matchAll(/<rect class="physics-body" ([^>]+)\/>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/(?:^|\s)(x|y|width|height)="([^"]+)"/g)].map(m => [m[1], +m[2]])));
}

test('distance remains visible and updates with motion at every camera scale', () => {
  const { api } = lab();
  for (const i of [2, 4]) {
    api.load(i); const sim = api.sims[i], s = api.S;
    s.launched = true;
    const check = () => {
      const value = Math.abs(s.x2 - s.x1).toFixed(2).replace('.', ',');
      assert.ok(sim.render(s).includes(`Odległość środków: ${value} m`));
      assert.ok(sim.readout(s).eq.includes(`${value}&nbsp;m`));
    };
    check(); const initial = s.x2 - s.x1;
    advance(sim, s, 0.5); check();
    assert.ok(i === 2 ? s.x2 - s.x1 > initial : s.x2 - s.x1 < initial);
    advance(sim, s, 300); api.state.showVectors = false; check();
  }
});

test('both third-law examples retain fixed rectangular bodies at all camera scales', () => {
  const { api } = lab();
  for (const index of [2, 4]) {
    api.load(index);
    const sim = api.sims[index], s = api.S;
    for (const m of [0.5, 10]) {
      s.p.m1 = m; s.p.m2 = 10.5 - m;
      for (const e of [0, 0.5, 1]) {
        if (index === 4) s.p.e = e;
        sim.reset(s); s.launched = true;
        const times = index === 4 ? [0, s.contact.at, s.contact.at + s.contact.duration / 2, s.contact.at + s.contact.duration, 300] : [0, 0.2, 300];
        for (const t of times) {
          if (index === 4) sim.evaluate(s, t);
          else advance(sim, s, t - s.t, 0.1);
          const rectangles = bodyRects(sim.render(s));
          assert.equal(rectangles.length, 2);
          for (const r of rectangles) {
            assert.equal(r.width, 72); assert.equal(r.height, 52);
            assert.ok(r.x >= 18 && r.x + r.width <= 882);
          }
          const gap = rectangles[1].x - rectangles[0].x - rectangles[0].width;
          assert.ok(gap >= -1e-8, 'rectangles must never overlap');
          if (index === 4 && (s.phase === 'contact' || (e === 0 && s.phase === 'after'))) near(gap, 0);
        }
      }
    }
  }
});

test('collision type and restitution slider stay synchronized and reset the experiment', () => {
  const { api, elements } = lab(); api.load(4);
  const select = api.ctl.kind.input, slider = api.ctl.e.input;
  for (const kind of [0, 0.5, 1]) {
    select.events.change({ target: { value: String(kind) } });
    near(api.S.p.e, kind); near(+slider.value, kind);
    elements.get('btn-start').events.click(); api.frame(50);
    slider.events.input({ target: { value: '0.3' } });
    near(api.S.p.kind, 0.5); near(+select.value, 0.5);
    near(api.S.p.e, 0.3); near(api.S.t, 0);
    assert.equal(api.state.mode, 'idle');
  }
  for (const e of [0, 1]) {
    slider.events.input({ target: { value: String(e) } });
    near(+select.value, e);
  }
  select.events.change({ target: { value: '0' } });
  elements.get('view-graph').events.click();
  elements.get('btn-start').events.click();
  for (let t = 100; t <= 2100; t += 50) api.frame(t);
  assert.ok(!/NaN|Infinity/.test(api.scene.innerHTML));
  near(api.S.v1, api.S.v2);
});
