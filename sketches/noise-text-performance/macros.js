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
      // M4 is inverted: v=1 is "fully hushed", v=0 is "full presence".
      // Switch handler in switches.js should NOT call apply('m4', 0) on press
      // (that would slam every param to max). Press should leave M4's targets
      // alone — just reset the macro knob's LED and let the operator restore
      // params manually. See PLAN.md Task 9 m4 press handler.
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

  // Track the last-applied value per macro so the debug overlay can render the
  // knob position. Macros write through to PARAMS but don't store position
  // there; this keeps a separate slot.
  for (const m of Object.values(macros)) m.value = 0;

  function setValue(name, v) {
    const m = macros[name];
    if (m) m.value = v;
  }

  function compute(name, v) {
    const m = macros[name];
    if (!m) throw new Error(`unknown macro: ${name}`);
    return m.compute(v);
  }

  function apply(name, v) {
    setValue(name, v);
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
    macros, compute, apply, setValue, byCC, nameByCC,
    all: () => Object.values(macros),
  };
})();
