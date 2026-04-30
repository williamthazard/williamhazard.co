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
