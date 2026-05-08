// tests-params.js

// Step 1: mappedValue curve tests
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

// Step 5: setParam, setParamByCC, LED queue tests
TESTS.test('setParam writes to manual, leaves value unchanged', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  try {
    PARAMS.setParam('testKnob', 0.42);
    const p = PARAMS.byName('testKnob');
    TESTS.assert(p.manual === 0.42, 'manual should be 0.42');
    TESTS.assert(p.value === 0, 'value should still be 0');
  } finally {
    delete PARAMS.params.testKnob;
  }
});

TESTS.test('setParam constrains v to [0,1]', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0.5, value: 0, lastSentToLed: -1, apply: () => {},
  };
  try {
    PARAMS.setParam('testKnob', 1.5);
    TESTS.assert(PARAMS.byName('testKnob').manual === 1);
    PARAMS.setParam('testKnob', -0.3);
    TESTS.assert(PARAMS.byName('testKnob').manual === 0);
  } finally {
    delete PARAMS.params.testKnob;
  }
});

TESTS.test('setParamByCC normalizes raw 0..127 to 0..1', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  try {
    PARAMS.setParamByCC(99, 127);
    TESTS.assert(TESTS.approx(PARAMS.byName('testKnob').manual, 1));
    PARAMS.setParamByCC(99, 0);
    TESTS.assert(PARAMS.byName('testKnob').manual === 0);
    PARAMS.setParamByCC(99, 64);
    TESTS.assert(TESTS.approx(PARAMS.byName('testKnob').manual, 64 / 127, 0.001));
  } finally {
    delete PARAMS.params.testKnob;
  }
});

TESTS.test('setParam queues an LED echo', () => {
  PARAMS.drainLedQueue();
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  try {
    PARAMS.setParam('testKnob', 0.5);
    const queue = PARAMS.drainLedQueue();
    TESTS.assert(queue.length === 1, `expected 1 echo, got ${queue.length}`);
    TESTS.assert(queue[0].cc === 99);
    TESTS.assert(queue[0].value === Math.round(0.5 * 127));
  } finally {
    delete PARAMS.params.testKnob;
  }
});

TESTS.test('byCC finds param by CC number', () => {
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0, value: 0, lastSentToLed: -1, apply: () => {},
  };
  try {
    TESTS.assert(PARAMS.byCC(99) === PARAMS.params.testKnob);
    TESTS.assert(PARAMS.byCC(123) === undefined);
  } finally {
    delete PARAMS.params.testKnob;
  }
});

TESTS.test('setParamByCC drops incoming raw matching lastSentToLed (echo-loop suppression)', () => {
  PARAMS.drainLedQueue();
  PARAMS.params.testKnob = {
    cc: 99, label: 'test', range: [0, 1], curve: 'linear',
    manual: 0.3, value: 0, lastSentToLed: 64, apply: () => {},
  };
  try {
    PARAMS.setParamByCC(99, 64);  // matches lastSentToLed — should be dropped
    TESTS.assert(PARAMS.byName('testKnob').manual === 0.3, 'manual should not change on echo');
    const queue = PARAMS.drainLedQueue();
    TESTS.assert(queue.length === 0, `expected 0 queued echoes, got ${queue.length}`);
    // Same CC with a different raw should still go through.
    PARAMS.setParamByCC(99, 65);
    TESTS.assert(PARAMS.byName('testKnob').manual !== 0.3, 'non-matching raw should write through');
  } finally {
    delete PARAMS.params.testKnob;
  }
});

// Step 10: Registry sanity-check tests
TESTS.test('all 58 params are registered', () => {
  const names = Object.keys(PARAMS.params);
  TESTS.assert(names.length === 58, `expected 58, got ${names.length}: ${names.join(',')}`);
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
