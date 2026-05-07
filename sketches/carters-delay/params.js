// params.js — Carter's Delay parameter registry.
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
    if (raw === p.lastSentToLed) return;
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

  // Carter's Delay has no autonomous engine, so no modulation pass — value === manual always.
  function modulationPass() {
    for (const p of all()) p.value = p.manual;
  }

  return {
    params, all, byName, byCC, mappedValue,
    setParam, setParamByCC, drainLedQueue, applyAll, modulationPass,
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
  reg('micVol',        { cc: 0,  label: 'Mic Volume',         range: [0, 1],         curve: 'pow:2.0', default: 0 });
  reg('masterVol',     { cc: 1,  label: 'Master Volume',      range: [0, 1],         curve: 'pow:2.0', default: 0 });
  reg('bpm',           { cc: 2,  label: 'BPM',                range: [40, 240],      curve: 'linear', default: 0.4 }); // ~120 BPM
  reg('modAmount',     { cc: 3,  label: 'Mod Amount',         range: [0, 1],         curve: 'linear', default: 0 });
  reg('preLpf',        { cc: 4,  label: 'Pre-LPF Cutoff',     range: [12000, 200],   curve: 'expInverted', default: 0 }); // 12k cap avoids BiquadFilter nominal-range clamping warnings on low-sample-rate audio contexts
  reg('preDist',       { cc: 5,  label: 'Pre-Distortion',     range: [0, 0.95],      curve: 'pow:0.8', default: 0 });
  reg('reverbWet',     { cc: 6,  label: 'Reverb Wet',         range: [0, 0.88],      curve: 'pow:2.0', default: 0 });
  reg('reverbDecay',   { cc: 7,  label: 'Reverb Decay',       range: [0.5, 6],       curve: 'linear', default: 0.273 });
  reg('density',       { cc: 8,  label: 'Density',            range: [0.1, 10],      curve: 'exp',    default: 0.2 }); // mapped ~0.25× — sparse by default, room to grow
  reg('grainDurScale', { cc: 9,  label: 'Grain Duration',     range: [0.1, 3],       curve: 'exp',    default: 0.85 }); // mapped ~1.85× — long, sustained grains by default
  reg('cutoffBase',    { cc: 10, label: 'Cutoff Center',      range: [200, 12000],   curve: 'exp',    default: 0.6 });
  reg('resonance',     { cc: 11, label: 'Resonance',          range: [0, 3],         curve: 'linear', default: 0.3 });
  reg('panRange',      { cc: 12, label: 'Pan Range',          range: [0, 1],         curve: 'linear', default: 0.7 });
  reg('ampRange',      { cc: 13, label: 'Amp Range',          range: [0, 2],         curve: 'linear', default: 0.5 });
  reg('lfoSpeed',      { cc: 14, label: 'LFO Speed',          range: [0.1, 5],       curve: 'exp',    default: 0.25 }); // mapped ~0.28× — slow drift by default
  reg('lfoVariance',   { cc: 15, label: 'LFO Variance',       range: [0, 1],         curve: 'linear', default: 0.5 });

  // Bank 2 — Feedback patchcord
  reg('fbkLevel',     { cc: 16, label: 'Feedback',            range: [0, 0.95],      curve: 'pow:2.0', default: 0 });
  reg('preserve',     { cc: 17, label: 'Preserve',            range: [0, 1],         curve: 'linear', default: 0 });
  reg('fbkHpf',       { cc: 18, label: 'Fbk HPF',             range: [20, 800],      curve: 'exp',    default: 0 });
  reg('fbkBalance',   { cc: 19, label: 'Fbk Balance',         range: [-1, 1],        curve: 'bipolar', default: 0.5 });
  reg('fbkNoise',     { cc: 20, label: 'Fbk Noise',           range: [0, 0.5],       curve: 'pow:2.0', default: 0 });
  reg('fbkSine',      { cc: 21, label: 'Fbk Sine',            range: [0, 0.5],       curve: 'pow:2.0', default: 0 });
  reg('fbkSineHz',    { cc: 22, label: 'Fbk Sine Hz',         range: [40, 1200],     curve: 'exp',    default: 0.45 });
  reg('softClipDrive',{ cc: 23, label: 'Softclip Drive',      range: [0, 1],         curve: 'linear', default: 0.05 }); // gentle by default; turning it up adds saturation/noise character to feedback
  // CCs 24-31 free in Bank 2 (rows 3+4)
})();
