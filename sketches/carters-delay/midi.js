const MIDI = (() => {
  let access = null;
  let inputPort = null;
  let outputPort = null;
  const inputQueue = [];
  let onConnectionChange = () => {};

  const recentMessages = [];
  const MAX_LOG = 20;
  function logMessage(entry) {
    recentMessages.push(entry);
    if (recentMessages.length > MAX_LOG) recentMessages.shift();
  }

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

  return {
    connect, drainInputs, sendCC, bindInput, bindOutput,
    isBound, setOnConnectionChange, listDevices,
    flushLedQueue, getRecentMessages: () => recentMessages.slice(),
  };
})();
