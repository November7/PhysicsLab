const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

exports.load = (file, expose, wrapped = true) => {
  class Element {
    events = {}; children = new Map(); style = {}; value = ''; checked = true;
    classList = { toggle() {} };
    querySelector(key) {
      if (!this.children.has(key)) this.children.set(key, new Element());
      return this.children.get(key);
    }
    addEventListener(key, fn) { this.events[key] = fn; }
    appendChild() {}
    replaceChildren() {}
    add() {}
    focus() {}
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
    getScreenCTM() { return { inverse: () => ({}) }; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 400 }; }
    getContext() { return new Proxy({}, { get: () => () => {} }); }
  }
  const elements = new Map();
  const document = {
    body: new Element(), hidden: false,
    getElementById(id) {
      // Unlike the general stub, this optional control must reflect the active scene.
      if (id === 'preset') return null;
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    createElement: () => new Element(), querySelectorAll: () => []
  };
  for (const [id, value] of Object.entries({ density: '1.5', lineWidth: '1.5', arrowGap: '110' })) document.getElementById(id).value = value;
  const window = new Element(); window.devicePixelRatio = 1;
  const context = vm.createContext({
    document, window, performance: { now: () => 0 }, requestAnimationFrame: () => 1,
    DOMPoint: class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } },
    Option: class {}, ResizeObserver: class { observe() {} },
    getComputedStyle: () => ({ getPropertyValue: key => key, fontFamily: 'sans-serif' })
  });
  let source = readFileSync(join(__dirname, '..', file), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const exports = `globalThis.api = { ${expose} };`;
  source = wrapped ? source.replace(/\}\)\(\);\s*$/, `${exports}})();`) : source + exports;
  vm.runInContext(source, context);
  return { api: context.api, elements, window };
};
