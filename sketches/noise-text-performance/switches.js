const SWITCHES = (() => {
  const state = {
    autoScrollOn: false,
    // 'muted' tracks the prerecorded chain's mute toggle. After Begin runs
    // setMuted(false), audio is "not muted" — so initial state is false.
    // (micMuted stays true because the mic-side muteGate actually starts at 0.)
    muted: false,
    engineOn: false,
    micMuted: true,
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
    // knob's LED ring and the macro's tracked value; leave the targets alone
    // so the operator can decide manually. See macros.js M4 note.
    15: () => { MACROS.setValue('m4', 0); MIDI.sendCC(15, 0); },
    16: () => { PARAMS.setParam('vSpatial', 0.371); },
    17: () => { PARAMS.setParam('vTimeSpd', 0.625); },
    18: () => { PARAMS.setParam('vFlowSpd', 0.25); },
    32: () => {
      state.micMuted = !state.micMuted;
      if (typeof MIC !== 'undefined' && MIC.setMuted) MIC.setMuted(state.micMuted);
      MIDI.sendCC(32, state.micMuted ? 127 : 0, 1);
    },
  };

  function handle(cc) {
    const fn = handlers[cc];
    if (fn) fn();
  }

  return { handle, state, handlers };
})();
