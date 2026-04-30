// macros.js
const MACROS = (() => {
  const macros = {
    m1: {
      cc: 12,
      label: 'M1 Intensity',
      // Each value is the unshaped 0..1 input; the param's curve does the
      // shaping in mappedValue. (E.g. distortion's pow:0.8 curve is applied
      // once when value is read by the audio chain — don't pre-shape here.)
      compute: (v) => ({
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
