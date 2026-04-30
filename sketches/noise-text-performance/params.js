// params.js
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
                        engineFn: (e) => Math.pow(e.normInt, 0.8) });
  reg('reverbWet',    { cc: 7,  label: 'Reverb Wet',           range: [0, 0.88],      curve: 'pow:2.0', default: 0,
                        engineFn: (e) => Math.pow(e.normInt, 2.0) });
  reg('jitterAmt',    { cc: 8,  label: 'Jitter Amount',        range: [0, 0.45],      curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.15 ? e.normInt : 0 });
  reg('stutterProb',  { cc: 9,  label: 'Stutter Probability',  range: [0, 0.04],      curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.55 ? 1 : 0 });
  reg('masterPitch',  { cc: 10, label: 'Master Pitch',         range: [0.5, 2.0],     curve: 'exp',    default: 0.5 });

  // Bank 2 — Detail
  reg('vSpatial',     { cc: 16, label: 'Visual Spatial Frequency', range: [0.05, 0.4],   curve: 'linear', default: 0.371 });
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
