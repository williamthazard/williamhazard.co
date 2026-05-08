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
  reg('vSpatial',     { cc: 16, label: 'Visual Spatial Frequency', range: [0.05, 0.4],   curve: 'linear', default: 0.371 });
  reg('vTimeSpd',     { cc: 17, label: 'Visual Time Speed',         range: [0.005, 0.2], curve: 'exp',    default: 0.625 });
  reg('vFlowSpd',     { cc: 18, label: 'Visual Flow Speed',         range: [0.0, 0.08],  curve: 'linear', default: 0.25 });
  reg('delayWet',     { cc: 19, label: 'Delay Wet',                 range: [0, 1],       curve: 'pow:2.0', default: 0 });
  reg('lpfRes',       { cc: 20, label: 'LPF Resonance',             range: [0.001, 30],  curve: 'exp',    default: 0 });
  reg('delayTime',    { cc: 21, label: 'Delay Time',                range: [0.1, 15.0],  curve: 'exp',    default: 0.55 }); // base seconds; default ≈ 1.5s; taps span 0.75–9s at default
  reg('delayFbk',     { cc: 22, label: 'Delay Feedback',            range: [0, 0.85],    curve: 'linear', default: 0 });
  reg('reverbDecay',  { cc: 23, label: 'Reverb Decay',              range: [0.5, 6],     curve: 'linear', default: 0.273 });
  reg('jitterFreq',   { cc: 24, label: 'Jitter Frequency',          range: [0.1, 3.0],   curve: 'exp',    default: 0.611 });
  reg('reverseProb',  { cc: 25, label: 'Reverse Probability',       range: [0, 0.06],    curve: 'linear', default: 0,
                        engineFn: (e) => e.normInt > 0.65 ? 1 : 0 });
  reg('stutterMax',   { cc: 26, label: 'Stutter Max Skip',          range: [0.05, 2.0],  curve: 'linear', default: 0.359 });
  reg('preserve',     { cc: 27, label: 'Preserve',                  range: [0, 1],       curve: 'linear', default: 0 });
  reg('fbkHpf',       { cc: 28, label: 'Fbk HPF',                   range: [20, 800],    curve: 'exp',    default: 0 });
  reg('fbkNoise',     { cc: 29, label: 'Fbk Noise',                 range: [0, 0.5],     curve: 'pow:2.0', default: 0 });
  reg('fbkSine',      { cc: 30, label: 'Fbk Sine',                  range: [0, 0.5],     curve: 'pow:2.0', default: 0 });
  reg('fbkSineHz',    { cc: 31, label: 'Fbk Sine Hz',               range: [40, 1200],   curve: 'exp',    default: 0.45 });

  // Bank 3 — Live mic chain. CCs reassigned so the delay/feedback patchcord aligns
  // with Bank 2's (row, col) positions: when banks are shown side-by-side in the
  // debug overlay, Mic Delay Wet sits directly below Delay Wet, etc.
  // Bank 3 grid layout (CC at each position):
  //   (1,1) 32 micVol      | (1,2) 33 micGain    | (1,3) 34 micLpf     | (1,4) 35 micDelayWet  ← mirrors Bank 2 (1,4)
  //   (2,1) 36 micDist     | (2,2) 37 micDelayTm | (2,3) 38 micFbkLvl  | (2,4) 39 micRevDecay  ← mirrors row 2
  //   (3,1) 40 micRevWet   | (3,2) 41 micFbkBal  | (3,3) 42 (free)     | (3,4) 43 micPreserve  ← mirrors (3,4)
  //   (4,1) 44 micFbkHpf   | (4,2) 45 micFbkNoi  | (4,3) 46 micFbkSin  | (4,4) 47 micFbkSinHz  ← mirrors row 4
  reg('micVol',       { cc: 32, label: 'Mic Volume',         range: [0, 1],         curve: 'pow:2.0', default: 0 });
  reg('micGain',      { cc: 33, label: 'Mic Gain',           range: [0, 4],         curve: 'pow:2.0', default: 0.25 });
  reg('micLpfFreq',   { cc: 34, label: 'Mic LPF Cutoff',     range: [20000, 300],   curve: 'expInverted', default: 0 });
  reg('micDelayWet',  { cc: 35, label: 'Mic Delay Wet',      range: [0, 1],         curve: 'pow:2.0', default: 0 });
  reg('micDist',      { cc: 36, label: 'Mic Distortion',     range: [0, 0.95],      curve: 'pow:0.8', default: 0 });
  reg('micDelayTime', { cc: 37, label: 'Mic Delay Time',     range: [0.1, 15.0],    curve: 'exp',    default: 0.55 });
  reg('micFbkLevel',  { cc: 38, label: 'Mic Feedback',       range: [0, 0.95],      curve: 'pow:2.0', default: 0 });
  reg('micRevDecay',  { cc: 39, label: 'Mic Reverb Decay',   range: [0.5, 6],       curve: 'linear', default: 0.273 });
  reg('micRevWet',    { cc: 40, label: 'Mic Reverb Wet',     range: [0, 0.88],      curve: 'pow:2.0', default: 0 });
  reg('micFbkBalance',{ cc: 41, label: 'Mic Fbk Balance',    range: [-1, 1],        curve: 'bipolar', default: 0.5 });
  // CC 42 free
  reg('micPreserve',  { cc: 43, label: 'Mic Preserve',       range: [0, 1],         curve: 'linear', default: 0 });
  reg('micFbkHpf',    { cc: 44, label: 'Mic Fbk HPF',        range: [20, 800],      curve: 'exp',    default: 0 });
  reg('micFbkNoise',  { cc: 45, label: 'Mic Fbk Noise',      range: [0, 0.5],       curve: 'pow:2.0', default: 0 });
  reg('micFbkSine',   { cc: 46, label: 'Mic Fbk Sine',       range: [0, 0.5],       curve: 'pow:2.0', default: 0 });
  reg('micFbkSineHz', { cc: 47, label: 'Mic Fbk Sine Hz',    range: [40, 1200],     curve: 'exp',    default: 0.45 });

  // Bank 4 — Granular delay character (8 per chain)
  reg('cutoffBase',      { cc: 48, label: 'Prerec Cutoff',     range: [200, 12000],  curve: 'exp',    default: 0.6 });
  reg('resonance',       { cc: 49, label: 'Prerec Res',        range: [0, 3],        curve: 'linear', default: 0.3 });
  reg('panRange',        { cc: 50, label: 'Prerec Pan Range',  range: [0, 1],        curve: 'linear', default: 0.7 });
  reg('ampRange',        { cc: 51, label: 'Prerec Amp Range',  range: [0, 2],        curve: 'linear', default: 0.5 });
  reg('lfoSpeed',        { cc: 52, label: 'Prerec LFO Speed',  range: [0.1, 5],      curve: 'exp',    default: 0.25 });
  reg('density',         { cc: 53, label: 'Prerec Density',    range: [0.1, 10],     curve: 'exp',    default: 0.2 });
  reg('grainDurScale',   { cc: 54, label: 'Prerec Grain Dur',  range: [0.1, 3],      curve: 'exp',    default: 0.85 });
  reg('softClipDrive',   { cc: 55, label: 'Prerec Softclip',   range: [0, 1],        curve: 'linear', default: 0.05 });

  reg('micCutoffBase',    { cc: 56, label: 'Mic Cutoff',        range: [200, 12000],  curve: 'exp',    default: 0.6 });
  reg('micResonance',     { cc: 57, label: 'Mic Res',           range: [0, 3],        curve: 'linear', default: 0.3 });
  reg('micPanRange',      { cc: 58, label: 'Mic Pan Range',     range: [0, 1],        curve: 'linear', default: 0.7 });
  reg('micAmpRange',      { cc: 59, label: 'Mic Amp Range',     range: [0, 2],        curve: 'linear', default: 0.5 });
  reg('micLfoSpeed',      { cc: 60, label: 'Mic LFO Speed',     range: [0.1, 5],      curve: 'exp',    default: 0.25 });
  reg('micDensity',       { cc: 61, label: 'Mic Density',       range: [0.1, 10],     curve: 'exp',    default: 0.2 });
  reg('micGrainDurScale', { cc: 62, label: 'Mic Grain Dur',     range: [0.1, 3],      curve: 'exp',    default: 0.85 });
  reg('micSoftClipDrive', { cc: 63, label: 'Mic Softclip',      range: [0, 1],        curve: 'linear', default: 0.05 });
})();
