const SWITCHES = (() => {
  const state = {
    // Both gates start open — operator controls audibility via the Mic Vol /
    // Master Vol knobs. Press toggles into mute. Initial values match the
    // actual gain-node values built in audio.js so the first press isn't a
    // silent state-sync no-op.
    micMuted: false,
    outMuted: false,
  };

  const handlers = {
    0: () => {
      state.micMuted = !state.micMuted;
      if (typeof AUDIO !== 'undefined' && AUDIO.setMicMuted) AUDIO.setMicMuted(state.micMuted);
      MIDI.sendCC(0, state.micMuted ? 127 : 0, 1);
    },
    1: () => {
      state.outMuted = !state.outMuted;
      if (typeof AUDIO !== 'undefined' && AUDIO.setOutputMuted) AUDIO.setOutputMuted(state.outMuted);
      MIDI.sendCC(1, state.outMuted ? 127 : 0, 1);
    },
    2: () => { PARAMS.setParam('bpm', 0.4); }, // BPM press → reset to 120 (v=0.4)
  };

  function handle(cc) {
    const fn = handlers[cc];
    if (fn) fn();
  }

  return { handle, state, handlers };
})();
