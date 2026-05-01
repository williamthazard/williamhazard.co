# Noise Text (Performance Variant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live-performance variant of the `noise-text` p5.js sketch, controlled via WebMIDI from a Midi Fighter Twister, with bidirectional MIDI for LED feedback, a parameter registry architecture, four curated macros, and a togglable autonomous-engine modulation layer.

**Architecture:** Single-page p5.js sketch in p5 global mode, no build step. Six namespaced modules (`PARAMS`, `MACROS`, `ENGINE`, `MIDI`, `UI`, plus `sketch.js`) loaded via separate `<script>` tags. Central `params` registry holds `manual` (operator's set value) and `value` (effective post-modulation value) per parameter. All param writes flow through a single `setParam` dispatcher.

**Tech Stack:** p5.js 1.9.4 (global mode), p5.sound 1.9.4, native WebMIDI (`navigator.requestMIDIAccess`), vanilla DOM for UI overlays.

**Reference docs:**
- `DESIGN.md` (this folder) — full architecture spec.
- `MFT-MAPPINGS.md` (this folder) — operator-facing knob layout, CC numbers, macro effect tables.

**Working directory for all paths:** `/Users/spencergraham/Desktop/other/williamhazard.co/sketches/noise-text-performance/`. Paths are relative to this directory unless absolute.

**DOM safety:** All UI overlay code in this plan uses `createElement` + `textContent` + property setters. Do not introduce `innerHTML` for user-derived strings (MIDI device names come from the browser but should still be set via `textContent` to avoid surprise).

---

## Task 1: Scaffold the new sketch + test harness

Create the folder structure, copy assets and the original sketch as a starting point, stub all module files, and set up a tiny browser-loaded test harness so subsequent tasks can be TDD-driven.

**Files:**
- Create: `index.html`, `test.html`, `tests.js`
- Create: `params.js`, `macros.js`, `engine.js`, `midi.js`, `ui.js` (empty stubs)
- Create: `sketch.js` (initially a copy of `../noise-text/sketch.js`)
- Create: `assets/perpetuum.txt`, `assets/we-live-inside-a-dream.mp3` (copies)

- [ ] **Step 1: Copy assets**

```bash
cp ../noise-text/assets/perpetuum.txt assets/perpetuum.txt
cp ../noise-text/assets/we-live-inside-a-dream.mp3 assets/we-live-inside-a-dream.mp3
ls assets/
```

Expected: both files present.

- [ ] **Step 2: Copy sketch.js as a starting point**

```bash
cp ../noise-text/sketch.js sketch.js
```

This is the baseline; later tasks refactor it to use the PARAMS registry. Keeping it as-is for now means the page is runnable end-to-end after this scaffolding step.

- [ ] **Step 3: Create stub `params.js`**

```js
// params.js
const PARAMS = (() => {
  const params = {};
  function byName(name) { return params[name]; }
  function byCC(cc) { return Object.values(params).find(p => p.cc === cc); }
  return {
    params,
    all: () => Object.values(params),
    byName,
    byCC,
  };
})();
```

- [ ] **Step 4: Create stub `macros.js`**

```js
// macros.js
const MACROS = (() => {
  const macros = {};
  return {
    macros,
    all: () => Object.values(macros),
    byName: (name) => macros[name],
  };
})();
```

- [ ] **Step 5: Create stub `engine.js`**

```js
// engine.js
const ENGINE = (() => {
  let active = false;
  return {
    activate: () => { active = true; },
    deactivate: () => { active = false; },
    isActive: () => active,
    tick: () => ({ normInt: 0, sine: 0, perlin: 0 }),
  };
})();
```

- [ ] **Step 6: Create stub `midi.js`**

```js
// midi.js
const MIDI = (() => {
  return {
    connect: async () => ({ ok: false, reason: 'not implemented' }),
    sendCC: () => {},
    flushLedQueue: () => {},
    drainInputs: () => {},
    isBound: () => false,
  };
})();
```

- [ ] **Step 7: Create stub `ui.js`**

```js
// ui.js
const UI = (() => {
  return {
    showBegin: () => {},
    hideBegin: () => {},
    showPicker: () => {},
    hidePicker: () => {},
    toggleDebug: () => {},
    showDisconnect: () => {},
    hideDisconnect: () => {},
  };
})();
```

- [ ] **Step 8: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noisy Text — Performance</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/addons/p5.sound.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { overflow: hidden; background: #0a0a12; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script src="params.js"></script>
  <script src="macros.js"></script>
  <script src="engine.js"></script>
  <script src="midi.js"></script>
  <script src="ui.js"></script>
  <script src="sketch.js"></script>
</body>
</html>
```

- [ ] **Step 9: Create `tests.js` with assertion helpers**

```js
// tests.js — pure-function tests; load via test.html
const TESTS = (() => {
  const results = [];

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }
  function approx(a, b, eps = 1e-6) {
    return Math.abs(a - b) <= eps;
  }
  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: e.message });
    }
  }

  function run() {
    const failed = results.filter(r => !r.ok);
    const passed = results.filter(r => r.ok);
    console.log(`%c${passed.length} passed`, 'color: #4ade80');
    if (failed.length) {
      console.log(`%c${failed.length} failed`, 'color: #f87171');
      for (const r of failed) {
        console.log(`%c  ✗ ${r.name}: ${r.error}`, 'color: #f87171');
      }
    } else {
      console.log('%call tests passed', 'color: #4ade80; font-weight: bold');
    }
  }

  return { assert, approx, test, run };
})();
```

- [ ] **Step 10: Create `test.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tests — Noise Text Performance</title>
  <style>body { font-family: monospace; padding: 16px; } </style>
</head>
<body>
  <h1>Noise Text Performance — tests</h1>
  <p>Open the browser console to view results.</p>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>

  <script src="tests.js"></script>
  <script src="params.js"></script>
  <script src="macros.js"></script>
  <script src="engine.js"></script>

  <script src="tests-params.js"></script>
  <script src="tests-macros.js"></script>
  <script src="tests-engine.js"></script>

  <script>
    window.addEventListener('load', () => TESTS.run());
  </script>
</body>
</html>
```

- [ ] **Step 11: Create empty test files**

```bash
touch tests-params.js tests-macros.js tests-engine.js
ls *.js
```

Expected output includes: `engine.js  macros.js  midi.js  params.js  sketch.js  tests-engine.js  tests-macros.js  tests-params.js  tests.js  ui.js`

- [ ] **Step 12: Sanity-check both pages**

Open `index.html` in a browser. The page should render the original sketch (text + audio control UI in bottom right). The new performance behavior is not yet implemented; this just confirms the scaffold doesn't break the original.

Open `test.html` in a browser. Console should show: `0 passed` and `all tests passed`.

- [ ] **Step 13: Commit**

```bash
git add sketches/noise-text-performance/
git commit -m "scaffold noise-text-performance variant with module stubs and test harness"
```

---

## Task 2: PARAMS module — curves, dispatch, and registry

Build the parameter registry: curve mapping, lookup helpers, `setParam` write path, and the registered param entries from `MFT-MAPPINGS.md`. No audio-chain wiring yet — `apply` is a stub on each param that subsequent tasks replace.

**Files:**
- Modify: `params.js`
- Modify: `tests-params.js`

- [ ] **Step 1: Write tests for `mappedValue` curves**

In `tests-params.js`:

```js
TESTS.test('mappedValue linear: v=0 → range[0]', () => {
  const p = { value: 0, range: [10, 20], curve: 'linear' };
  TESTS.assert(PARAMS.mappedValue(p) === 10);
});

TESTS.test('mappedValue linear: v=1 → range[1]', () => {
  const p = { value: 1, range: [10, 20], curve: 'linear' };
  TESTS.assert(PARAMS.mappedValue(p) === 20);
});

TESTS.test('mappedValue linear: v=0.5 → midpoint', () => {
  const p = { value: 0.5, range: [10, 20], curve: 'linear' };
  TESTS.assert(PARAMS.mappedValue(p) === 15);
});

TESTS.test('mappedValue exp: v=0 → range[0]', () => {
  const p = { value: 0, range: [100, 1000], curve: 'exp' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), 100));
});

TESTS.test('mappedValue exp: v=1 → range[1]', () => {
  const p = { value: 1, range: [100, 1000], curve: 'exp' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), 1000));
});

TESTS.test('mappedValue exp: v=0.5 → geometric mid', () => {
  const p = { value: 0.5, range: [100, 1000], curve: 'exp' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), Math.sqrt(100 * 1000), 0.001));
});

TESTS.test('mappedValue pow:2.0: v=0.5 → 0.25 of range', () => {
  const p = { value: 0.5, range: [0, 100], curve: 'pow:2.0' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), 25));
});

TESTS.test('mappedValue pow:0.8: v=0.5 → 100*pow(0.5,0.8)', () => {
  const p = { value: 0.5, range: [0, 100], curve: 'pow:0.8' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), 100 * Math.pow(0.5, 0.8), 0.01));
});

TESTS.test('mappedValue bipolar: v=0.5 → 0 (center)', () => {
  const p = { value: 0.5, range: [-1, 1], curve: 'bipolar' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), 0));
});

TESTS.test('mappedValue bipolar: v=0 → range[0]', () => {
  const p = { value: 0, range: [-1, 1], curve: 'bipolar' };
  TESTS.assert(TESTS.approx(PARAMS.mappedValue(p), -1));
});
```

- [ ] **Step 2: Run tests, verify all 10 fail**

Open `test.html`. Console should show 10 failed tests (`PARAMS.mappedValue is not a function`).

- [ ] **Step 3: Implement `mappedValue`**

In `params.js`, replace the IIFE body:

```js
const PARAMS = (() => {
  const params = {};

  function mappedValue(p) {
    const v = p.value;
    const [a, b] = p.range;
    if (p.curve === 'linear' || p.curve === 'bipolar') {
      return a + (b - a) * v;
    }
    if (p.curve === 'exp' || p.curve === 'expInverted') {
      return a * Math.pow(b / a, v);
    }
    if (p.curve && p.curve.startsWith('pow:')) {
      const n = parseFloat(p.curve.slice(4));
      return a + (b - a) * Math.pow(v, n);
    }
    throw new Error(`unknown curve: ${p.curve}`);
  }

  function byName(name) { return params[name]; }
  function byCC(cc) { return Object.values(params).find(p => p.cc === cc); }
  function all() { return Object.values(params); }

  return { params, all, byName, byCC, mappedValue };
})();
```

- [ ] **Step 4: Run tests, verify all 10 pass**

Reload `test.html`. Console: `10 passed   all tests passed`.

- [ ] **Step 5: Add tests for `setParam`, `setParamByCC`, and the LED echo queue**

Append to `tests-params.js`:

```js
TESTS.test('setParam writes to manual, leaves value unchanged', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  PARAMS.setParam('testKnob', 0.42);
  const p = PARAMS.byName('testKnob');
  TESTS.assert(p.manual === 0.42, 'manual should be 0.42');
  TESTS.assert(p.value === 0, 'value should still be 0');
  delete PARAMS.params.testKnob;
});

TESTS.test('setParam constrains v to [0,1]', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0.5, value: 0, lastSentToLed: -1, apply: () => {},
  };
  PARAMS.setParam('testKnob', 1.5);
  TESTS.assert(PARAMS.byName('testKnob').manual === 1);
  PARAMS.setParam('testKnob', -0.3);
  TESTS.assert(PARAMS.byName('testKnob').manual === 0);
  delete PARAMS.params.testKnob;
});

TESTS.test('setParamByCC normalizes raw 0..127 to 0..1', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  PARAMS.setParamByCC(99, 127);
  TESTS.assert(TESTS.approx(PARAMS.byName('testKnob').manual, 1));
  PARAMS.setParamByCC(99, 0);
  TESTS.assert(PARAMS.byName('testKnob').manual === 0);
  PARAMS.setParamByCC(99, 64);
  TESTS.assert(TESTS.approx(PARAMS.byName('testKnob').manual, 64 / 127, 0.001));
  delete PARAMS.params.testKnob;
});

TESTS.test('setParam queues an LED echo', () => {
  PARAMS.drainLedQueue();
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  PARAMS.setParam('testKnob', 0.5);
  const queue = PARAMS.drainLedQueue();
  TESTS.assert(queue.length === 1, `expected 1 echo, got ${queue.length}`);
  TESTS.assert(queue[0].cc === 99);
  TESTS.assert(queue[0].value === Math.round(0.5 * 127));
  delete PARAMS.params.testKnob;
});

TESTS.test('byCC finds param by CC number', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  TESTS.assert(PARAMS.byCC(99) === PARAMS.params.testKnob);
  TESTS.assert(PARAMS.byCC(123) === undefined);
  delete PARAMS.params.testKnob;
});
```

- [ ] **Step 6: Run tests, verify the 5 new ones fail**

`PARAMS.setParam is not a function` etc.

- [ ] **Step 7: Implement `setParam`, `setParamByCC`, `drainLedQueue`, and `applyAll`**

Expand `params.js`:

```js
const PARAMS = (() => {
  const params = {};
  let ledQueue = [];

  function constrain01(v) {
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function setParam(name, v) {
    const p = params[name];
    if (!p) return;
    p.manual = constrain01(v);
    ledQueue.push({ cc: p.cc, value: Math.round(p.manual * 127) });
  }

  function setParamByCC(cc, raw) {
    const p = byCC(cc);
    if (!p) return;
    if (raw === p.lastSentToLed) return; // echo-loop suppression
    const name = Object.keys(params).find(k => params[k] === p);
    setParam(name, raw / 127);
  }

  function drainLedQueue() {
    const out = ledQueue;
    ledQueue = [];
    return out;
  }

  function mappedValue(p) {
    const v = p.value;
    const [a, b] = p.range;
    if (p.curve === 'linear' || p.curve === 'bipolar') return a + (b - a) * v;
    if (p.curve === 'exp' || p.curve === 'expInverted') return a * Math.pow(b / a, v);
    if (p.curve && p.curve.startsWith('pow:')) {
      const n = parseFloat(p.curve.slice(4));
      return a + (b - a) * Math.pow(v, n);
    }
    throw new Error(`unknown curve: ${p.curve}`);
  }

  function byName(name) { return params[name]; }
  function byCC(cc) { return Object.values(params).find(p => p.cc === cc); }
  function all() { return Object.values(params); }

  function applyAll() {
    for (const p of all()) {
      if (p.apply) p.apply(mappedValue(p));
    }
  }

  return {
    params, all, byName, byCC, mappedValue,
    setParam, setParamByCC, drainLedQueue, applyAll,
  };
})();
```

- [ ] **Step 8: Run tests, all 15 pass**

- [ ] **Step 9: Define all params in the registry**

Append to `params.js`:

```js
(function registerParams() {
  function reg(name, cfg) {
    PARAMS.params[name] = {
      manual: cfg.default,
      value: cfg.default,
      lastSentToLed: -1,
      apply: () => {},
      ...cfg,
    };
  }

  // Bank 1 — Performance
  reg('scrollPos',    { cc: 0,  label: 'Scroll Position',      range: [0, 1],         curve: 'linear', default: 0 });
  reg('autoScroll',   { cc: 1,  label: 'Auto-Scroll Velocity', range: [-1, 1],        curve: 'bipolar', default: 0.5 });
  reg('masterVol',    { cc: 2,  label: 'Master Volume',        range: [0, 1],         curve: 'pow:2.0', default: 0 }); // pow:2.0 (not exp) because exp requires range[0] > 0; quadratic still gives the desired logarithmic feel for volume
  reg('modAmount',    { cc: 3,  label: 'Modulation Amount',    range: [0, 1],         curve: 'linear', default: 0 });
  reg('visualJag',    { cc: 4,  label: 'Visual Jagginess',     range: [0, 225],       curve: 'pow:3.2', default: 0,
                        engineFn: (e) => e.normInt });
  reg('lpfFreq',      { cc: 5,  label: 'LPF Cutoff',           range: [20000, 300],   curve: 'expInverted', default: 0,
                        engineFn: (e) => e.normInt });
  reg('distortion',   { cc: 6,  label: 'Distortion',           range: [0, 0.95],      curve: 'pow:0.8', default: 0,
                        engineFn: (e) => e.normInt });
  reg('reverbWet',    { cc: 7,  label: 'Reverb Wet',           range: [0, 0.88],      curve: 'pow:2.0', default: 0,
                        engineFn: (e) => e.normInt });
  reg('jitterAmt',    { cc: 8,  label: 'Jitter Amount',        range: [0, 0.45],      curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.15 ? e.normInt : 0 });
  reg('stutterProb',  { cc: 9,  label: 'Stutter Probability',  range: [0, 0.04],      curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.55 ? 1 : 0 });
  reg('masterPitch',  { cc: 10, label: 'Master Pitch',         range: [0.5, 2.0],     curve: 'exp',    default: 0.5 });

  // Bank 2 — Detail
  reg('vSpatial',     { cc: 16, label: 'Visual Spatial Frequency', range: [0.05, 0.4],   curve: 'linear', default: 0.371 }); // (0.18 of [0.05,0.4] is at v≈0.371)
  reg('vTimeSpd',     { cc: 17, label: 'Visual Time Speed',         range: [0.005, 0.2], curve: 'exp',    default: 0.625 });
  reg('vFlowSpd',     { cc: 18, label: 'Visual Flow Speed',         range: [0.0, 0.08],  curve: 'linear', default: 0.25 });
  reg('lpfRes',       { cc: 20, label: 'LPF Resonance',             range: [0.001, 30],  curve: 'exp',    default: 0 });
  reg('delayTime',    { cc: 21, label: 'Delay Time',                range: [0.001, 0.6], curve: 'exp',    default: 0.367 });
  reg('delayFbk',     { cc: 22, label: 'Delay Feedback',            range: [0, 0.85],    curve: 'linear', default: 0 });
  reg('reverbDecay',  { cc: 23, label: 'Reverb Decay',              range: [0.5, 6],     curve: 'linear', default: 0.273 });
  reg('jitterFreq',   { cc: 24, label: 'Jitter Frequency',          range: [0.1, 3.0],   curve: 'exp',    default: 0.611 });
  reg('reverseProb',  { cc: 25, label: 'Reverse Probability',       range: [0, 0.06],    curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.65 ? 1 : 0 });
  reg('stutterMax',   { cc: 26, label: 'Stutter Max Skip',          range: [0.05, 2.0],  curve: 'linear', default: 0.359 });
})();
```

The `default` for params with non-zero "natural" starting values is the v that produces the corresponding mapped output (e.g., `vSpatial` defaults to 0.371 because `0.05 + (0.4 - 0.05) * 0.371 ≈ 0.18`, the original sketch's spatial frequency).

- [ ] **Step 10: Sanity-check the registry**

Append to `tests-params.js`:

```js
TESTS.test('all 21 params are registered', () => {
  const names = Object.keys(PARAMS.params);
  TESTS.assert(names.length === 21, `expected 21, got ${names.length}: ${names.join(',')}`);
});

TESTS.test('every param has cc, range, curve, default', () => {
  for (const p of PARAMS.all()) {
    TESTS.assert(typeof p.cc === 'number', `${p.label}: missing cc`);
    TESTS.assert(Array.isArray(p.range) && p.range.length === 2, `${p.label}: bad range`);
    TESTS.assert(typeof p.curve === 'string', `${p.label}: bad curve`);
    TESTS.assert(typeof p.default === 'number', `${p.label}: bad default`);
  }
});

TESTS.test('every CC is unique among rotation params', () => {
  const ccs = PARAMS.all().map(p => p.cc);
  TESTS.assert(new Set(ccs).size === ccs.length, `duplicate CCs: ${ccs.sort().join(',')}`);
});

TESTS.test('engine-aware params have engineFn', () => {
  const expected = ['visualJag', 'lpfFreq', 'distortion', 'reverbWet', 'jitterAmt', 'stutterProb', 'reverseProb'];
  for (const name of expected) {
    TESTS.assert(typeof PARAMS.byName(name).engineFn === 'function', `${name}: missing engineFn`);
  }
});
```

- [ ] **Step 11: Run tests, all 19 pass**

- [ ] **Step 12: Commit**

```bash
git add params.js tests-params.js
git commit -m "params module with curves, dispatch, and registry from MFT mappings"
```

---

## Task 3: MACROS module — four curated macros

Implement the four macros (Intensity, Decay, Aggression, Hush) at CCs 12–15. Each macro's `compute` function returns `{ targetName: normalizedValue }`; `MACROS.apply` calls `PARAMS.setParam` for each target.

**Files:**
- Modify: `macros.js`
- Modify: `tests-macros.js`

- [ ] **Step 1: Write tests for M1 Intensity**

In `tests-macros.js`:

```js
TESTS.test('M1 Intensity at v=0 zeroes all targets', () => {
  const out = MACROS.compute('m1', 0);
  TESTS.assert(out.visualJag === 0);
  TESTS.assert(out.lpfFreq === 0);
  TESTS.assert(out.distortion === 0);
  TESTS.assert(out.reverbWet === 0);
  TESTS.assert(out.jitterAmt === 0);
  TESTS.assert(out.stutterProb === 0);
});

TESTS.test('M1 Intensity at v=1 maxes all targets', () => {
  const out = MACROS.compute('m1', 1);
  TESTS.assert(out.visualJag === 1);
  TESTS.assert(out.lpfFreq === 1);
  TESTS.assert(out.distortion === 1);
  TESTS.assert(out.reverbWet === 1);
  TESTS.assert(out.jitterAmt === 1);
  TESTS.assert(out.stutterProb === 1);
});

TESTS.test('M1 Intensity at v=0.1 (below jitter gate) leaves jitter at 0', () => {
  const out = MACROS.compute('m1', 0.1);
  TESTS.assert(out.jitterAmt === 0);
});

TESTS.test('M1 Intensity at v=0.4 (between gates) jitter on, stutter off', () => {
  const out = MACROS.compute('m1', 0.4);
  TESTS.assert(out.jitterAmt === 0.4);
  TESTS.assert(out.stutterProb === 0);
});
```

- [ ] **Step 2: Write tests for M2, M3, M4**

```js
TESTS.test('M2 Decay at v=1: heavy filter, full reverb, drop dist, drop vol', () => {
  const out = MACROS.compute('m2', 1);
  TESTS.assert(TESTS.approx(out.visualJag, 0.3));
  TESTS.assert(out.lpfFreq === 1);
  TESTS.assert(out.reverbWet === 1);
  TESTS.assert(out.distortion === 0);
  TESTS.assert(TESTS.approx(out.masterVol, 0.6));
});

TESTS.test('M3 Aggression at v=1: full chaos', () => {
  const out = MACROS.compute('m3', 1);
  TESTS.assert(out.distortion === 1);
  TESTS.assert(out.jitterAmt === 1);
  TESTS.assert(out.stutterProb === 1);
  TESTS.assert(out.reverseProb === 1);
  TESTS.assert(TESTS.approx(out.lpfFreq, 0.6));
});

TESTS.test('M4 Hush at v=1: silent, calm, open', () => {
  const out = MACROS.compute('m4', 1);
  TESTS.assert(out.masterVol === 0);
  TESTS.assert(out.visualJag === 0);
  TESTS.assert(out.lpfFreq === 0);
  TESTS.assert(out.jitterAmt === 0);
  TESTS.assert(out.stutterProb === 0);
  TESTS.assert(out.reverbWet === 0);
  TESTS.assert(out.distortion === 0);
});

TESTS.test('M4 Hush at v=0: leaves things at full', () => {
  const out = MACROS.compute('m4', 0);
  TESTS.assert(out.masterVol === 1);
  TESTS.assert(out.lpfFreq === 1);
});

TESTS.test('MACROS.apply writes through PARAMS.setParam', () => {
  PARAMS.setParam('jitterAmt', 0);
  MACROS.apply('m3', 0.7);
  TESTS.assert(PARAMS.byName('jitterAmt').manual === 0.7);
});
```

- [ ] **Step 3: Run tests, all 9 fail**

- [ ] **Step 4: Implement `macros.js`**

Replace the IIFE body:

```js
const MACROS = (() => {
  const macros = {
    m1: {
      cc: 12,
      label: 'M1 Intensity',
      compute: (v) => ({
        // Each value is the unshaped 0..1 input; the param's curve does the
        // shaping in mappedValue. (E.g. distortion's pow:0.8 curve is applied
        // once when value is read by the audio chain — don't pre-shape here.)
        visualJag:   v,
        lpfFreq:     v,
        distortion:  v,
        reverbWet:   v,
        jitterAmt:   v > 0.15 ? v : 0,
        stutterProb: v > 0.55 ? 1 : 0,
      }),
    },
    m2: {
      cc: 13,
      label: 'M2 Decay',
      compute: (v) => ({
        visualJag:  v * 0.3,
        lpfFreq:    v,
        reverbWet:  v,
        distortion: 0,
        masterVol:  1 - v * 0.4,
      }),
    },
    m3: {
      cc: 14,
      label: 'M3 Aggression',
      compute: (v) => ({
        distortion:  v,
        jitterAmt:   v,
        stutterProb: v,
        reverseProb: v,
        lpfFreq:     v * 0.6,
      }),
    },
    m4: {
      cc: 15,
      label: 'M4 Hush',
      compute: (v) => ({
        masterVol:   1 - v,
        visualJag:   1 - v,
        lpfFreq:     1 - v,
        jitterAmt:   1 - v,
        stutterProb: 1 - v,
        reverbWet:   1 - v,
        distortion:  1 - v,
      }),
    },
  };

  function compute(name, v) {
    const m = macros[name];
    if (!m) throw new Error(`unknown macro: ${name}`);
    return m.compute(v);
  }

  function apply(name, v) {
    const targets = compute(name, v);
    for (const [paramName, paramValue] of Object.entries(targets)) {
      PARAMS.setParam(paramName, paramValue);
    }
  }

  function byCC(cc) {
    return Object.values(macros).find(m => m.cc === cc);
  }

  function nameByCC(cc) {
    return Object.keys(macros).find(k => macros[k].cc === cc);
  }

  return {
    macros, compute, apply, byCC, nameByCC,
    all: () => Object.values(macros),
  };
})();
```

- [ ] **Step 5: Run tests, all 9 new pass (28 total)**

- [ ] **Step 6: Commit**

```bash
git add macros.js tests-macros.js
git commit -m "macros module with M1-M4 (Intensity, Decay, Aggression, Hush)"
```

---

## Task 4: ENGINE module — autonomous sine+Perlin source

Implement the autonomous engine. It activates on demand, resets `startFrame`, and ticks each frame to produce a `normInt` value matching the original sketch.

**Files:**
- Modify: `engine.js`
- Modify: `tests-engine.js`

- [ ] **Step 1: Write tests**

In `tests-engine.js`:

```js
TESTS.test('ENGINE starts inactive', () => {
  TESTS.assert(ENGINE.isActive() === false);
});

TESTS.test('ENGINE activate() makes it active', () => {
  ENGINE.activate();
  TESTS.assert(ENGINE.isActive() === true);
  ENGINE.deactivate();
});

TESTS.test('ENGINE deactivate() returns it to inactive and zeros lastTick', () => {
  ENGINE.activate();
  ENGINE.deactivate();
  TESTS.assert(ENGINE.isActive() === false);
  const t = ENGINE.tick();
  TESTS.assert(t.normInt === 0);
});

TESTS.test('ENGINE tick() inactive returns the lastTick (zero on init)', () => {
  ENGINE.deactivate();
  const t = ENGINE.tick();
  TESTS.assert(t.normInt === 0);
});

TESTS.test('ENGINE first tick after activate produces normInt ≈ 0 (sine starts at -1)', () => {
  ENGINE.activate();
  const t = ENGINE.tick();
  TESTS.assert(TESTS.approx(t.normInt, 0, 0.01), `expected ~0, got ${t.normInt}`);
  ENGINE.deactivate();
});
```

- [ ] **Step 2: Run tests, all 5 fail**

- [ ] **Step 3: Implement `engine.js`**

```js
const ENGINE = (() => {
  let active = false;
  let startFrame = 0;
  let lastTick = { normInt: 0, sine: 0, perlin: 0 };

  function activate() {
    active = true;
    startFrame = (typeof frameCount !== 'undefined') ? frameCount : 0;
  }

  function deactivate() {
    active = false;
    lastTick = { normInt: 0, sine: 0, perlin: 0 };
  }

  function tick() {
    if (!active) return lastTick;
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const f = fc - startFrame;
    const sineWave = Math.sin(f * 0.0005 - Math.PI / 2);
    const perlinNoise = (typeof noise === 'function') ? noise(f * 0.005) * 2 - 1 : 0;
    const noiseLevel = Math.min(1, Math.max(0, f / 1000)) * 0.05;
    const combined = sineWave + (perlinNoise - sineWave) * noiseLevel;
    const normInt = (combined + 1) * 0.5;
    lastTick = { normInt, sine: sineWave, perlin: perlinNoise };
    return lastTick;
  }

  return { activate, deactivate, tick, isActive: () => active };
})();
```

- [ ] **Step 4: Run tests, all 5 pass**

- [ ] **Step 5: Commit**

```bash
git add engine.js tests-engine.js
git commit -m "engine module: autonomous sine+perlin source with activate reset"
```

---

## Task 5: Modulation pass

Add `modulationPass()` to `PARAMS` so that once per frame, `value` is computed from `manual` blended with the engine's contribution proportional to the Mod Amount knob.

**Files:**
- Modify: `params.js`
- Modify: `tests-params.js`

- [ ] **Step 1: Write tests**

```js
TESTS.test('modulationPass mod=0: value === manual for all params', () => {
  PARAMS.setParam('lpfFreq', 0.7);
  PARAMS.setParam('modAmount', 0);
  PARAMS.modulationPass();
  TESTS.assert(PARAMS.byName('lpfFreq').value === 0.7);
});

TESTS.test('modulationPass with mod>0 but engine inactive: value === manual', () => {
  PARAMS.setParam('lpfFreq', 0.3);
  PARAMS.setParam('modAmount', 1.0);
  ENGINE.deactivate();
  PARAMS.modulationPass();
  TESTS.assert(PARAMS.byName('lpfFreq').value === 0.3);
});

TESTS.test('modulationPass with mod=1 + engine active: engine-aware value matches engineFn', () => {
  PARAMS.setParam('visualJag', 0.0);
  PARAMS.setParam('modAmount', 1.0);
  ENGINE.activate();
  PARAMS.modulationPass();
  const v = PARAMS.byName('visualJag').value;
  TESTS.assert(TESTS.approx(v, 0, 0.01), `expected ~0, got ${v}`);
  ENGINE.deactivate();
});

TESTS.test('modulationPass: non-engine-aware params keep manual', () => {
  PARAMS.setParam('delayTime', 0.42);
  PARAMS.setParam('modAmount', 1.0);
  ENGINE.activate();
  PARAMS.modulationPass();
  TESTS.assert(PARAMS.byName('delayTime').value === 0.42);
  ENGINE.deactivate();
});
```

- [ ] **Step 2: Run, verify failures**

- [ ] **Step 3: Implement `modulationPass`**

In `params.js`, inside the IIFE, before the `return`:

```js
  function modulationPass() {
    const m = byName('modAmount').manual;
    const engineActive = (typeof ENGINE !== 'undefined') && ENGINE.isActive();
    if (m <= 0 || !engineActive) {
      for (const p of all()) p.value = p.manual;
      return;
    }
    const e = ENGINE.tick();
    for (const p of all()) {
      if (p.engineFn) {
        const eContrib = p.engineFn(e);
        p.value = p.manual + (eContrib - p.manual) * m;
      } else {
        p.value = p.manual;
      }
    }
  }
```

Add `modulationPass` to the returned namespace.

- [ ] **Step 4: Run tests, all 4 pass (23 total)**

- [ ] **Step 5: Commit**

```bash
git add params.js tests-params.js
git commit -m "modulation pass: blend manual values with engine contribution"
```

---

## Task 6: sketch.js refactor — wire audio chain via PARAMS, replace draw block

Refactor the sketch so each registered param's `apply` calls into the audio chain, the draw loop runs `modulationPass()` then `applyAll()`, and the visual rendering reads post-modulation values.

**Files:**
- Modify: `sketch.js`

- [ ] **Step 1: Replace the audio chain wiring in `setup()`**

Find this block in `sketch.js`:

```js
  // Audio Chain: Audio -> Filter -> Distortion -> Delay (Glitch) -> Reverb -> Output
  lowPass = new p5.LowPass();
  distortion = new p5.Distortion();
  glitchDelay = new p5.Delay();
  reverb = new p5.Reverb();

  // Set initial clear state
  lowPass.freq(20000);
  reverb.drywet(0);
  glitchDelay.delayTime(0.01);
  glitchDelay.feedback(0);

  // Route audio through the chain
  poemAudio.disconnect();
  poemAudio.connect(lowPass);
  lowPass.connect(distortion);
  distortion.connect(glitchDelay);
  glitchDelay.connect(reverb);

  // Set initial muted state
  poemAudio.setVolume(0);

  // Create UI for audio controls
  createAudioUI();
```

Replace with:

```js
  lowPass = new p5.LowPass();
  distortion = new p5.Distortion();
  glitchDelay = new p5.Delay();
  reverb = new p5.Reverb();

  poemAudio.disconnect();
  poemAudio.connect(lowPass);
  lowPass.connect(distortion);
  distortion.connect(glitchDelay);
  glitchDelay.connect(reverb);

  poemAudio.setVolume(0);

  // Wire each audio-bound param's apply() into the audio chain.
  PARAMS.byName('lpfFreq').apply     = (mapped) => lowPass.freq(mapped);
  PARAMS.byName('lpfRes').apply      = (mapped) => lowPass.res(mapped);
  PARAMS.byName('distortion').apply  = (mapped) => {
    if (Math.abs(mapped - lastDistAmount) > 0.02) {
      distortion.set(mapped, 'none');
      lastDistAmount = mapped;
    }
  };
  PARAMS.byName('reverbWet').apply   = (mapped) => reverb.drywet(mapped);
  PARAMS.byName('reverbDecay').apply = (mapped) => reverb.set(mapped, 2);
  PARAMS.byName('delayTime').apply   = (mapped) => glitchDelay.delayTime(mapped);
  PARAMS.byName('delayFbk').apply    = (mapped) => glitchDelay.feedback(mapped);
  PARAMS.byName('masterVol').apply   = (mapped) => {
    if (!isMuted && audioStarted) poemAudio.setVolume(mapped);
  };
```

- [ ] **Step 2: Remove `createAudioUI` and related globals**

Delete the entire `createAudioUI` function. Delete these globals near the top of the file: `muteBtn`, `volSlider`, `speakerIcon`, `muteIcon`. Keep `isMuted`, `audioStarted`, `playbackDirection`, `lastDistAmount`, `lastJumpTime`, `touchY`.

- [ ] **Step 3: Replace the noise-driven block in `draw()`**

Find the block in `draw()` starting `let nf = 0.18;` and ending after the closing `}` of the `if (audioStarted)` audio mirroring block. Replace with:

```js
  if (typeof MIDI !== 'undefined' && MIDI.drainInputs) MIDI.drainInputs();

  // (Auto-scroll integration is wired in Task 9.)

  PARAMS.modulationPass();
  PARAMS.applyAll();

  const visualIntensity   = PARAMS.mappedValue(PARAMS.byName('visualJag'));
  const nf                = PARAMS.mappedValue(PARAMS.byName('vSpatial'));
  const tInc              = PARAMS.mappedValue(PARAMS.byName('vTimeSpd'));
  const flowInc           = PARAMS.mappedValue(PARAMS.byName('vFlowSpd'));
  const t                 = frameCount * tInc;
  const flow              = frameCount * flowInc;
  const jitterAmt         = PARAMS.mappedValue(PARAMS.byName('jitterAmt'));
  const jitterFreq        = PARAMS.mappedValue(PARAMS.byName('jitterFreq'));
  const stutterProb       = PARAMS.mappedValue(PARAMS.byName('stutterProb'));
  const stutterMax        = PARAMS.mappedValue(PARAMS.byName('stutterMax'));
  const reverseProb       = PARAMS.mappedValue(PARAMS.byName('reverseProb'));
  const masterPitch       = PARAMS.mappedValue(PARAMS.byName('masterPitch'));

  if (audioStarted) {
    if (jitterAmt > 0) {
      const jitter = (noise(frameCount * jitterFreq) - 0.5) * jitterAmt;
      if (random() < reverseProb) playbackDirection *= -1;
      poemAudio.rate((1 + jitter) * playbackDirection * masterPitch);
    } else {
      playbackDirection = 1;
      poemAudio.rate(masterPitch);
    }

    if (random() < stutterProb && frameCount - lastJumpTime > 15) {
      if (poemAudio.bufferSource) {
        try {
          poemAudio.bufferSource.stop();
          poemAudio.bufferSource.disconnect();
        } catch (e) { /* ignore */ }
      }
      const skip = random(0.01, stutterMax);
      poemAudio.jump(max(0, poemAudio.currentTime() - skip));
      lastJumpTime = frameCount;
    }
  }

  if (typeof MIDI !== 'undefined' && MIDI.flushLedQueue) MIDI.flushLedQueue();
```

The `visualIntensity` variable is now defined; the brownian rendering block below still uses it unchanged.

- [ ] **Step 4: Replace `toggleAudio` with `startAudio` / `setMuted`**

Find:

```js
function toggleAudio() {
  // ...existing body referring to muteBtn, volSlider, etc.
}
```

Replace with:

```js
function startAudio() {
  if (audioStarted) return Promise.resolve();
  return userStartAudio().then(() => {
    poemAudio.loop();
    audioStarted = true;
  });
}

function setMuted(m) {
  isMuted = m;
  if (m) poemAudio.setVolume(0);
  // Unmute is implicit: PARAMS.applyAll pushes masterVol next frame.
}
```

Remove any remaining references to `volSlider.value()` or `muteBtn` in the file.

- [ ] **Step 5: Smoke test**

Open `index.html`. Expected:
- Page renders the static text (Visual Jagginess at 0).
- No mute/volume UI in the corner.
- No audio plays (audio not started yet — Task 10 adds the Begin overlay).
- No console errors.

Fix any errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add sketch.js
git commit -m "sketch refactor: wire audio chain through PARAMS, remove old UI, use applyAll in draw"
```

---

## Task 7: MIDI input — connect, message dispatch

Implement WebMIDI input: request access, find the MFT (or any input/output), wire `onmidimessage` to route CCs to `PARAMS.setParamByCC`, `MACROS.apply`, or switch handlers.

**Files:**
- Modify: `midi.js`

- [ ] **Step 1: Implement `MIDI.connect`**

Replace the IIFE body of `midi.js`:

```js
const MIDI = (() => {
  let access = null;
  let inputPort = null;
  let outputPort = null;
  const inputQueue = [];
  let onConnectionChange = () => {};

  const MFT_NAME_RE = /midi.*fighter.*twister/i;

  async function connect(opts = {}) {
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
    } catch (e) {
      return { ok: false, reason: 'permission denied or not supported' };
    }

    access.onstatechange = handleStateChange;

    const inputs = [...access.inputs.values()];
    const outputs = [...access.outputs.values()];

    if (opts.preferInputId) {
      const explicit = inputs.find(p => p.id === opts.preferInputId);
      if (explicit) bindInput(explicit);
    } else {
      const matchIn = inputs.find(p => MFT_NAME_RE.test(p.name));
      if (matchIn) bindInput(matchIn);
    }

    if (opts.preferOutputId) {
      const explicit = outputs.find(p => p.id === opts.preferOutputId);
      if (explicit) bindOutput(explicit);
    } else {
      const matchOut = outputs.find(p => MFT_NAME_RE.test(p.name));
      if (matchOut) bindOutput(matchOut);
    }

    return {
      ok: true,
      hasInput: !!inputPort,
      hasOutput: !!outputPort,
      inputs: inputs.map(p => ({ id: p.id, name: p.name })),
      outputs: outputs.map(p => ({ id: p.id, name: p.name })),
    };
  }

  function bindInput(port) {
    if (inputPort) inputPort.onmidimessage = null;
    inputPort = port;
    inputPort.onmidimessage = (msg) => inputQueue.push(msg.data);
  }

  function bindOutput(port) {
    outputPort = port;
  }

  function handleStateChange(e) {
    onConnectionChange({ port: e.port, state: e.port.state });
  }

  function drainInputs() {
    while (inputQueue.length) {
      handleMessage(inputQueue.shift());
    }
  }

  function handleMessage(data) {
    const status = data[0] & 0xF0;
    const channel = data[0] & 0x0F;
    const cc = data[1];
    const value = data[2];
    if (status !== 0xB0) return;

    if (channel === 0) {
      const macroName = MACROS.nameByCC(cc);
      if (macroName) {
        MACROS.apply(macroName, value / 127);
      } else {
        PARAMS.setParamByCC(cc, value);
      }
    } else if (channel === 1) {
      if (value === 0) return;
      if (typeof SWITCHES !== 'undefined' && SWITCHES.handle) SWITCHES.handle(cc);
    }
  }

  function sendCC(cc, value, channel = 0) {
    if (!outputPort) return;
    outputPort.send([0xB0 | channel, cc, value]);
  }

  function isBound() { return !!inputPort && !!outputPort; }

  function setOnConnectionChange(fn) { onConnectionChange = fn; }

  function listDevices() {
    return access ? {
      inputs:  [...access.inputs.values()].map(p => ({ id: p.id, name: p.name })),
      outputs: [...access.outputs.values()].map(p => ({ id: p.id, name: p.name })),
    } : { inputs: [], outputs: [] };
  }

  return {
    connect, drainInputs, sendCC, bindInput, bindOutput,
    isBound, setOnConnectionChange, listDevices,
    flushLedQueue: () => {}, // Task 8 implements
  };
})();
```

- [ ] **Step 2: Smoke test in browser**

In the console:

```js
MIDI.connect().then(r => console.log(r));
```

If a MIDI device is connected: `{ ok: true, hasInput: true/false, hasOutput: true/false, ... }`.
If not: `{ ok: true, hasInput: false, hasOutput: false, inputs: [], outputs: [] }`.
If WebMIDI unsupported: `{ ok: false, reason: '...' }`.

- [ ] **Step 3: Manual CC test (if MFT available)**

```js
setInterval(() => console.log(PARAMS.byName('lpfFreq').manual), 200);
```

Turn the bank-1 LPF Cutoff knob (CC 5). Values 0..1 should print and change.

If no MFT, simulate:

```js
PARAMS.setParamByCC(5, 64);
console.log(PARAMS.byName('lpfFreq').manual); // ≈ 0.504
```

- [ ] **Step 4: Commit**

```bash
git add midi.js
git commit -m "midi input: connect, auto-detect MFT, dispatch CCs to PARAMS and MACROS"
```

---

## Task 8: MIDI output — LED feedback queue with throttling

Wire the LED echo queue from PARAMS to `MIDI.sendCC`, with per-CC throttling. Drain once per frame from `sketch.js`.

**Files:**
- Modify: `midi.js`

- [ ] **Step 1: Implement throttled `flushLedQueue`**

In `midi.js`, add inside the IIFE before the `return`:

```js
  const lastSentAt = new Map();
  const THROTTLE_MS = 30;

  function flushLedQueue() {
    if (!outputPort) return;
    const items = PARAMS.drainLedQueue();
    if (!items.length) return;
    const now = performance.now();
    const latest = new Map();
    for (const item of items) latest.set(item.cc, item.value);
    for (const [cc, value] of latest) {
      const last = lastSentAt.get(cc) || 0;
      if (now - last < THROTTLE_MS) continue;
      sendCC(cc, value);
      lastSentAt.set(cc, now);
      const p = PARAMS.byCC(cc);
      if (p) p.lastSentToLed = value;
    }
  }
```

Replace the stub `flushLedQueue: () => {}` in the returned namespace with `flushLedQueue,`.

- [ ] **Step 2: Smoke test with MFT (if available)**

Open `index.html`, click into the page. In console:

```js
MIDI.connect().then(() => PARAMS.setParam('lpfFreq', 1.0));
```

The MFT's LPF Cutoff knob LED ring should jump to full. Wait at least 30ms, then:

```js
PARAMS.setParam('lpfFreq', 0);
```

Ring should jump to empty. (If you fire the second call within 30ms of the first, the throttle drops it; that's expected.)

- [ ] **Step 3: Commit**

```bash
git add midi.js
git commit -m "midi output: LED echo queue with 30ms throttle and echo-loop suppression"
```

---

## Task 9: Switch handlers + auto-scroll integration

Implement switch CC handlers (auto-scroll toggle, mute, engine toggle, snap-to-zero macros, scroll jump-to-top, etc.), wire auto-scroll velocity into the per-frame loop, and echo the scroll-position LED ring while auto-scroll is active.

**Files:**
- Create: `switches.js`
- Modify: `index.html`
- Modify: `sketch.js`

- [ ] **Step 1: Create `switches.js`**

```js
const SWITCHES = (() => {
  const state = {
    autoScrollOn: false,
    muted: true,
    engineOn: false,
  };

  const handlers = {
    0:  () => { PARAMS.setParam('scrollPos', 0); },
    1:  () => {
      state.autoScrollOn = !state.autoScrollOn;
      MIDI.sendCC(1, state.autoScrollOn ? 127 : 0, 1);
    },
    2:  () => {
      state.muted = !state.muted;
      if (typeof setMuted === 'function') setMuted(state.muted);
      MIDI.sendCC(2, state.muted ? 127 : 0, 1);
    },
    3:  () => {
      state.engineOn = !state.engineOn;
      if (state.engineOn) ENGINE.activate(); else ENGINE.deactivate();
      MIDI.sendCC(3, state.engineOn ? 127 : 0, 1);
    },
    4:  () => { PARAMS.setParam('visualJag', 0); },
    10: () => { PARAMS.setParam('masterPitch', 0.5); },
    12: () => { MACROS.apply('m1', 0); MIDI.sendCC(12, 0); },
    13: () => { MACROS.apply('m2', 0); MIDI.sendCC(13, 0); },
    14: () => { MACROS.apply('m3', 0); MIDI.sendCC(14, 0); },
    // M4 press: do NOT call apply('m4', 0) — M4 is inverted, so v=0 writes
    // every target to MAX (the opposite of "release cleanly"). Just reset the
    // knob's LED ring and PARAMS manual value for the macro CC; leave the
    // targets alone so the operator can decide manually. See macros.js M4 note.
    15: () => { MIDI.sendCC(15, 0); },
    16: () => { PARAMS.setParam('vSpatial', 0.371); },
    17: () => { PARAMS.setParam('vTimeSpd', 0.625); },
    18: () => { PARAMS.setParam('vFlowSpd', 0.25); },
  };

  function handle(cc) {
    const fn = handlers[cc];
    if (fn) fn();
  }

  return { handle, state, handlers };
})();
```

- [ ] **Step 2: Add `<script src="switches.js"></script>` to `index.html`**

After `midi.js`, before `ui.js`:

```html
  <script src="params.js"></script>
  <script src="macros.js"></script>
  <script src="engine.js"></script>
  <script src="midi.js"></script>
  <script src="switches.js"></script>
  <script src="ui.js"></script>
  <script src="sketch.js"></script>
```

- [ ] **Step 3: Wire auto-scroll into the draw loop**

In `sketch.js`, in `draw()`, replace the placeholder comment `// (Auto-scroll integration is wired in Task 9.)` with:

```js
  if (SWITCHES.state.autoScrollOn) {
    const v = PARAMS.mappedValue(PARAMS.byName('autoScroll'));
    if (Math.abs(v) > 0.05) {
      const MAX_AUTO_SPEED = 10;
      targetScroll += v * MAX_AUTO_SPEED;
      targetScroll = constrain(targetScroll, 0, totalPoemHeight - height);
    }
    const denom = totalPoemHeight - height;
    PARAMS.setParam('scrollPos', denom > 0 ? targetScroll / denom : 0);
  } else {
    targetScroll = PARAMS.byName('scrollPos').manual * (totalPoemHeight - height);
  }
```

- [ ] **Step 4: Smoke test with MFT (if available)**

After connecting:
- Press auto-scroll knob (CC 1 switch). Switch LED lights. Turn the knob off-center; text scrolls; scroll-position knob's LED ring follows.
- Press auto-scroll again. Off. Turn scroll-position knob; text scrolls under your finger.
- Press M3. Bank-1 distortion, jitter, stutter, reverse, LPF rings snap. Audio changes.

- [ ] **Step 5: Commit**

```bash
git add switches.js index.html sketch.js
git commit -m "switches and auto-scroll: handlers for press CCs, scroll velocity loop with LED mirror"
```

---

## Task 10: UI — Begin overlay + audio + MIDI startup

Implement the Begin overlay: full-screen click-to-start that activates audio context and requests MIDI. On MIDI bind, set Master Volume default to 0; without MIDI, set to 0.5.

**Files:**
- Modify: `ui.js`
- Modify: `sketch.js`

- [ ] **Step 1: Implement `UI.showBegin` (DOM-safe)**

Replace the IIFE body of `ui.js`:

```js
const UI = (() => {
  let beginEl = null;
  let pickerEl = null;
  let debugEl = null;
  let disconnectEl = null;
  let debugVisible = false;
  let debugRefreshId = null;

  function showBegin(onClick) {
    if (beginEl) return;
    beginEl = document.createElement('div');
    beginEl.id = 'begin-overlay';
    Object.assign(beginEl.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(10, 10, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10000', cursor: 'pointer',
      color: '#e0e0f0', fontFamily: 'monospace', fontSize: '24px',
      letterSpacing: '0.2em', userSelect: 'none',
    });
    beginEl.textContent = 'CLICK TO BEGIN';
    beginEl.addEventListener('click', async () => {
      beginEl.textContent = 'STARTING…';
      await onClick();
      hideBegin();
    });
    document.body.appendChild(beginEl);
  }

  function hideBegin() {
    if (beginEl) { beginEl.remove(); beginEl = null; }
  }

  // Stubs for later tasks.
  function showPicker() {}
  function hidePicker() {}
  function toggleDebug() {}
  function showDisconnect() {}
  function hideDisconnect() {}

  return {
    showBegin, hideBegin,
    showPicker, hidePicker,
    toggleDebug,
    showDisconnect, hideDisconnect,
  };
})();
```

- [ ] **Step 2: Add Begin call to `sketch.js setup()`**

At the end of `setup()`:

```js
  UI.showBegin(async () => {
    await startAudio();
    const result = await MIDI.connect();
    if (result.ok && result.hasInput && result.hasOutput) {
      PARAMS.setParam('masterVol', 0);
    } else if (result.ok && (result.hasInput || result.hasOutput)) {
      PARAMS.setParam('masterVol', 0);
    } else {
      PARAMS.setParam('masterVol', 0.5);
    }
    setMuted(false);
  });
```

- [ ] **Step 3: Smoke test**

Open `index.html`. Expected:
- Overlay covers the page with `CLICK TO BEGIN`.
- Click → overlay disappears.
- With MFT: silent until you turn Master Volume.
- Without MFT: audio plays at half volume.

- [ ] **Step 4: Commit**

```bash
git add ui.js sketch.js
git commit -m "ui: Begin overlay, audio + MIDI activation with conditional master volume default"
```

---

## Task 11: UI — Device picker (auto-detect fallback)

When `MIDI.connect()` returns `ok: true` but didn't auto-bind a MFT, present a device picker. Built with createElement + textContent — no innerHTML.

**Files:**
- Modify: `ui.js`
- Modify: `sketch.js`

- [ ] **Step 1: Implement `UI.showPicker` using safe DOM construction**

In `ui.js`, replace the `function showPicker() {}` stub with:

```js
  function showPicker(devices, onConfirm) {
    if (pickerEl) return;
    pickerEl = document.createElement('div');
    Object.assign(pickerEl.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(10, 10, 18, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10000', color: '#e0e0f0', fontFamily: 'monospace',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: '#1a1a26', padding: '32px', borderRadius: '8px',
      minWidth: '400px', border: '1px solid rgba(255,255,255,0.1)',
    });

    const title = document.createElement('p');
    title.textContent = 'No Midi Fighter Twister detected.';
    title.style.marginBottom = '16px';
    card.appendChild(title);

    function buildSelect(label, options) {
      const lbl = document.createElement('label');
      lbl.textContent = label;
      Object.assign(lbl.style, { display: 'block', marginBottom: '8px' });
      const sel = document.createElement('select');
      Object.assign(sel.style, {
        width: '100%', padding: '6px', marginBottom: '16px',
        background: '#0a0a12', color: '#e0e0f0', border: '1px solid #333',
        fontFamily: 'inherit',
      });
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '— none —';
      sel.appendChild(noneOpt);
      for (const d of options) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name; // textContent — safe even if name has HTML chars
        sel.appendChild(opt);
      }
      card.appendChild(lbl);
      card.appendChild(sel);
      return sel;
    }

    const inSel = buildSelect('MIDI input:', devices.inputs);
    const outSel = buildSelect('MIDI output:', devices.outputs);

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '8px';
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Continue';
    Object.assign(confirmBtn.style, {
      padding: '8px 16px', marginRight: '8px',
      background: '#444', color: '#fff', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit',
    });
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    Object.assign(skipBtn.style, {
      padding: '8px 16px', background: 'transparent',
      color: '#aaa', border: '1px solid #333', cursor: 'pointer',
      fontFamily: 'inherit',
    });
    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(skipBtn);
    card.appendChild(btnRow);

    confirmBtn.addEventListener('click', () => {
      const inputId = inSel.value || null;
      const outputId = outSel.value || null;
      hidePicker();
      onConfirm({ inputId, outputId });
    });
    skipBtn.addEventListener('click', () => {
      hidePicker();
      onConfirm({ inputId: null, outputId: null });
    });

    pickerEl.appendChild(card);
    document.body.appendChild(pickerEl);
  }

  function hidePicker() {
    if (pickerEl) { pickerEl.remove(); pickerEl = null; }
  }
```

- [ ] **Step 2: Wire picker into the Begin flow in `sketch.js`**

Replace the Begin onClick callback in `setup()`:

```js
  UI.showBegin(async () => {
    await startAudio();
    const result = await MIDI.connect();
    if (!result.ok) {
      PARAMS.setParam('masterVol', 0.5);
      setMuted(false);
      return;
    }
    if (result.hasInput && result.hasOutput) {
      PARAMS.setParam('masterVol', 0);
      setMuted(false);
      return;
    }
    UI.showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
      if (inputId || outputId) {
        await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
        PARAMS.setParam('masterVol', 0);
      } else {
        PARAMS.setParam('masterVol', 0.5);
      }
      setMuted(false);
    });
  });
```

- [ ] **Step 3: Smoke test**

With no MFT plugged in: click Begin → picker appears with available devices. Select one or Skip → picker dismisses, audio starts.

With MFT plugged in: picker should NOT appear; auto-detect succeeds.

- [ ] **Step 4: Commit**

```bash
git add ui.js sketch.js
git commit -m "ui: device picker for MIDI auto-detect fallback (safe DOM construction)"
```

---

## Task 12: UI — Debug overlay (toggleable with `d`)

Implement the debug overlay: live param values, MIDI log, FPS, reopen-picker link. Toggled with `d` key. Built with createElement + textContent — no innerHTML.

**Files:**
- Modify: `ui.js`
- Modify: `midi.js` (add MIDI log buffer)
- Modify: `sketch.js` (wire `keyPressed`)

- [ ] **Step 1: Add MIDI log buffer**

In `midi.js`, near the top of the IIFE:

```js
  const recentMessages = [];
  const MAX_LOG = 20;
  function logMessage(entry) {
    recentMessages.push(entry);
    if (recentMessages.length > MAX_LOG) recentMessages.shift();
  }
```

In `handleMessage`, log each message:

```js
  function handleMessage(data) {
    const status = data[0] & 0xF0;
    const channel = data[0] & 0x0F;
    const cc = data[1];
    const value = data[2];
    if (status !== 0xB0) return;

    const entry = { t: Date.now(), channel, cc, value };
    if (channel === 0) {
      const macroName = MACROS.nameByCC(cc);
      if (macroName) {
        entry.target = `macro:${macroName}`;
        MACROS.apply(macroName, value / 127);
      } else {
        const p = PARAMS.byCC(cc);
        entry.target = p ? `param:${p.label}` : `unmapped:cc${cc}`;
        PARAMS.setParamByCC(cc, value);
      }
    } else if (channel === 1) {
      entry.target = `switch:cc${cc}`;
      if (value !== 0 && typeof SWITCHES !== 'undefined' && SWITCHES.handle) {
        SWITCHES.handle(cc);
      }
    }
    logMessage(entry);
  }
```

Add `getRecentMessages: () => recentMessages.slice()` to the namespace return.

- [ ] **Step 2: Implement `UI.toggleDebug` (DOM-safe)**

Replace the `function toggleDebug() {}` stub in `ui.js`:

```js
  function toggleDebug() {
    if (debugVisible) { hideDebug(); } else { showDebug(); }
  }

  function showDebug() {
    if (debugEl) return;
    debugEl = document.createElement('div');
    Object.assign(debugEl.style, {
      position: 'fixed', left: '12px', bottom: '12px',
      background: 'rgba(10,10,18,0.85)', color: '#cfd0e0',
      padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px',
      lineHeight: '1.4', borderRadius: '6px',
      minWidth: '420px', maxWidth: '520px',
      maxHeight: '70vh', overflow: 'auto', zIndex: '9999',
      backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.06)',
      whiteSpace: 'pre',
    });
    document.body.appendChild(debugEl);
    debugVisible = true;
    refreshDebugLoop();
  }

  function hideDebug() {
    if (debugRefreshId) {
      clearTimeout(debugRefreshId);
      debugRefreshId = null;
    }
    if (debugEl) { debugEl.remove(); debugEl = null; }
    debugVisible = false;
  }

  function refreshDebugLoop() {
    if (!debugVisible) return;
    renderDebug();
    debugRefreshId = setTimeout(refreshDebugLoop, 100);
  }

  function renderDebug() {
    if (!debugEl) return;
    while (debugEl.firstChild) debugEl.removeChild(debugEl.firstChild);

    function addLine(text, isHeader) {
      const line = document.createElement('div');
      line.textContent = text;
      if (isHeader) line.style.fontWeight = 'bold';
      debugEl.appendChild(line);
    }
    function addBlank() {
      const line = document.createElement('div');
      line.textContent = '';
      debugEl.appendChild(line);
    }

    addLine(`MIDI: ${MIDI.isBound() ? '✓ bound' : '✗ not bound'}`, true);
    addBlank();

    addLine('PARAMS', true);
    for (const p of PARAMS.all()) {
      const m = p.manual.toFixed(3);
      const v = p.value.toFixed(3);
      const out = PARAMS.mappedValue(p).toFixed(3);
      addLine(`  ${p.label.padEnd(28, ' ')} m=${m}  v=${v}  out=${out}`);
    }
    addBlank();

    addLine('RECENT MIDI', true);
    const msgs = MIDI.getRecentMessages ? MIDI.getRecentMessages() : [];
    for (const m of msgs.slice(-10).reverse()) {
      addLine(`  ch${m.channel} cc${m.cc} v${m.value}  → ${m.target || ''}`);
    }
    addBlank();

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = '[ Reopen device picker ]';
    link.style.color = '#8af';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
        await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
      });
    });
    debugEl.appendChild(link);
  }
```

Add `toggleDebug` to the returned namespace (it was already there from the stub).

- [ ] **Step 3: Wire 'd' key in `sketch.js`**

Add a top-level `keyPressed` function:

```js
function keyPressed() {
  if (key === 'd' || key === 'D') UI.toggleDebug();
}
```

- [ ] **Step 4: Smoke test**

Open `index.html`, click Begin, press `d`. Overlay appears with live values. Turn knobs (or call `PARAMS.setParam(...)` from console) — values update at 10 Hz. Press `d` again — overlay hides.

- [ ] **Step 5: Commit**

```bash
git add midi.js ui.js sketch.js
git commit -m "ui: debug overlay toggled with 'd' key, with live params and MIDI log"
```

---

## Task 13: UI — Disconnect indicator

Show a small red dot when a previously-bound MIDI device disconnects; hide on reconnect with full LED state sync.

**Files:**
- Modify: `ui.js`
- Modify: `midi.js`

- [ ] **Step 1: Implement `UI.showDisconnect` and `UI.hideDisconnect`**

Replace the stubs in `ui.js`:

```js
  function showDisconnect() {
    if (disconnectEl) return;
    disconnectEl = document.createElement('div');
    Object.assign(disconnectEl.style, {
      position: 'fixed', right: '14px', bottom: '14px',
      width: '8px', height: '8px', borderRadius: '50%',
      background: '#e54141', boxShadow: '0 0 6px rgba(229,65,65,0.6)',
      zIndex: '9998',
    });
    document.body.appendChild(disconnectEl);
  }

  function hideDisconnect() {
    if (disconnectEl) { disconnectEl.remove(); disconnectEl = null; }
  }
```

- [ ] **Step 2: Implement reconnect + state sync in midi.js**

Replace `handleStateChange`:

```js
  function handleStateChange(e) {
    const port = e.port;
    if (port.state === 'disconnected') {
      const wasBound = (port === inputPort || port === outputPort);
      if (port === inputPort) inputPort = null;
      if (port === outputPort) outputPort = null;
      if (wasBound && typeof UI !== 'undefined') UI.showDisconnect();
    } else if (port.state === 'connected') {
      if (!inputPort && port.type === 'input' && MFT_NAME_RE.test(port.name)) {
        bindInput(port);
      }
      if (!outputPort && port.type === 'output' && MFT_NAME_RE.test(port.name)) {
        bindOutput(port);
      }
      if (inputPort && outputPort && typeof UI !== 'undefined') {
        UI.hideDisconnect();
        // Push full LED state sync.
        for (const p of PARAMS.all()) {
          const v = Math.round(p.manual * 127);
          sendCC(p.cc, v);
          p.lastSentToLed = v;
        }
        if (typeof SWITCHES !== 'undefined') {
          sendCC(1, SWITCHES.state.autoScrollOn ? 127 : 0, 1);
          sendCC(2, SWITCHES.state.muted ? 127 : 0, 1);
          sendCC(3, SWITCHES.state.engineOn ? 127 : 0, 1);
        }
      }
    }
    onConnectionChange({ port, state: port.state });
  }
```

- [ ] **Step 3: Manual test (if MFT available)**

After clicking Begin and confirming bind, unplug the MFT. Red dot appears in bottom-right. Replug. Red dot disappears; LED rings restore to current `manual` values.

- [ ] **Step 4: Commit**

```bash
git add ui.js midi.js
git commit -m "ui: disconnect indicator and auto-rebind with full LED state sync on reconnect"
```

---

## Task 14: End-to-end manual verification

Run through the full rehearsal checklist from `DESIGN.md` Section 15. Document any issues, fix inline, update spec/mappings as needed.

- [ ] **Step 1: Verify `test.html` passes**

Open `test.html`. Confirm "all tests passed" in the console. If not, fix and re-run.

- [ ] **Step 2: Run the rehearsal checklist (with MFT)**

For each item:

1. MFT auto-detect on connect — no picker shown.
2. Each granular knob produces the labeled effect.
3. Macros snap granular LED rings into formation.
4. Auto-scroll moves the scroll-position LED ring without hand-fighting on grab.
5. Mod Amount = 0.5, engine active → operator/engine duet feel.
6. Mod Amount press toggles engine cleanly.
7. Master Volume defaults to 0 with MFT bound.
8. Disconnect → reconnect: red dot, then disappears; LEDs restore.
9. Refresh during performance → silent-start state cleanly.
10. Debug overlay (`d`) toggles responsively.

- [ ] **Step 3: Run the rehearsal checklist (no MIDI)**

Open `index.html` with no MFT plugged in.

- Begin → device picker appears.
- Skip → audio starts at half volume.
- Visual is static; audio plays unmodified.
- Press `d` — debug overlay shows MIDI not bound.

- [ ] **Step 4: Test on Chrome (works) and Safari (graceful no-MIDI fallback)**

- Chrome: full functionality.
- Safari: picker is empty; Skip works; audio plays.

- [ ] **Step 5: Final commit (any rehearsal fixes)**

```bash
git status
# If there are fixes:
git add -A
git commit -m "rehearsal fixes"
```

---

## Summary of files at completion

```
sketches/noise-text-performance/
├── index.html              # entry point
├── test.html               # test runner page
├── tests.js                # assertion helpers
├── tests-params.js         # ~19 tests
├── tests-macros.js         # ~9 tests
├── tests-engine.js         # ~5 tests
├── sketch.js               # p5 lifecycle, audio chain, draw loop
├── params.js               # registry + dispatcher + modulation pass
├── macros.js               # M1-M4
├── engine.js               # autonomous source
├── midi.js                 # WebMIDI I/O + LED feedback
├── switches.js             # press CC handlers
├── ui.js                   # Begin, picker, debug, disconnect
├── DESIGN.md
├── MFT-MAPPINGS.md
├── PLAN.md
└── assets/
    ├── perpetuum.txt
    └── we-live-inside-a-dream.mp3
```

## Notes for the implementer

- **p5.js global mode**: `setup`, `draw`, `preload`, `keyPressed` are global functions; `frameCount`, `noise`, `random`, `lerp`, `constrain`, `map`, `width`, `height`, `HALF_PI` are global helpers. The IIFE modules use them directly.
- **MFT firmware variations**: the channel-1-rotation / channel-2-switch convention assumed here is the default for MFT firmware v04+. Older firmware uses different channels. If press CCs don't fire as expected during Task 9 smoke test, run the MFT Utility and confirm the side-switch channel.
- **Throttling sanity**: 30ms LED throttle = ~33 Hz. If LED rings look stutter-y in rehearsal, lower to 20ms. If they look fine, leave it.
- **DOM safety**: All UI overlays use `createElement` + `textContent` + property assignments — never `innerHTML`. MIDI device names from the WebMIDI API go into `<option>` elements via `textContent`, which is safe even if a name contains HTML-significant characters.
- **Audio chain side-effect timing**: `lowPass.freq()` and friends are cheap to call every frame; `distortion.set()` has a guard (>0.02 change) to avoid unnecessary rebuilding.
