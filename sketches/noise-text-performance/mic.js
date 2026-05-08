// mic.js — live microphone processing chain. Bank 3.
// Carter-flavored multi-tap delay subsystem via Delay.create() factory.
// Convolver reverb tail kept here (not inside the delay factory).
const MIC = (() => {
  let audioCtx = null;
  let micStream = null;
  let started = false;
  let muteGate = null;

  // Audio nodes (created in start()).
  let sourceNode = null;
  let micHpfNode = null;   // Fixed input HPF — kills sub-bass rumble (fan, mains hum, table thumps).
  let micInputGain = null; // micVol — gates the source into the chain (analog of poemAudio.setVolume).
                           //          When 0, no fresh audio enters the delay; tail keeps playing.
  let micGainNode = null;  // micGain — pre-amp before LPF/distortion (drive).
  let micLpfNode = null;
  let micDistNode = null;

  // Delay subsystem (factory instance).
  let delaySubsystem = null;

  // Reverb tail
  let micReverbNode = null;
  let micReverbDryGain = null;
  let micReverbWetGain = null;
  let lastMicReverbDecay = -1;

  // Build a soft-clip waveshaper curve. amount in [0, 1].
  function makeSoftClipCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    // Map amount → drive coefficient. Higher amount = harder clip.
    const k = 1 + amount * 50;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  function makeReverbImpulse(ctx, decaySeconds) {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * decaySeconds));
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
      }
    }
    return buffer;
  }

  async function start() {
    if (started) return { ok: true };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { ok: false, reason: 'getUserMedia not supported' };
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      return { ok: false, reason: 'permission denied or unavailable' };
    }

    audioCtx = (typeof getAudioContext === 'function') ? getAudioContext() : new AudioContext();
    sourceNode = audioCtx.createMediaStreamSource(micStream);

    // Source-level input gate — the analog of poemAudio.setVolume on the
    // prerecorded chain. Cutting this stops fresh mic from entering the chain
    // but lets the delay tail continue playing out from the buffer.
    micInputGain = audioCtx.createGain();
    micInputGain.gain.value = 0; // start silent (micVol default = 0)

    micGainNode = audioCtx.createGain();
    micGainNode.gain.value = 1; // pre-amp; default 1 (operator turns up via micGain knob)

    micLpfNode = audioCtx.createBiquadFilter();
    micLpfNode.type = 'lowpass';
    micLpfNode.frequency.value = 20000;
    micLpfNode.Q.value = 0.5;

    micDistNode = audioCtx.createWaveShaper();
    micDistNode.curve = makeSoftClipCurve(0);
    micDistNode.oversample = '2x';

    // ---------- Granular Carter's Delay (factored module) ----------
    delaySubsystem = await Delay.create(audioCtx);

    // Reverb tail (kept here, not inside the delay factory).
    micReverbNode = audioCtx.createConvolver();
    micReverbNode.buffer = makeReverbImpulse(audioCtx, 2.0);
    micReverbDryGain = audioCtx.createGain();
    micReverbWetGain = audioCtx.createGain();
    micReverbDryGain.gain.value = 1;
    micReverbWetGain.gain.value = 0;

    muteGate = audioCtx.createGain();
    muteGate.gain.value = 0; // start hard-muted; switch CC 32 unmutes

    delaySubsystem.output.connect(micReverbDryGain);
    delaySubsystem.output.connect(micReverbNode);
    micReverbNode.connect(micReverbWetGain);
    micReverbDryGain.connect(muteGate);
    micReverbWetGain.connect(muteGate);
    muteGate.connect(audioCtx.destination);

    // Fixed input HPF — removes sub-bass rumble (fan, mains hum, table thumps)
    // before any processing or delay path. Not exposed as a knob; ~80 Hz is a
    // safe vocal/instrument default.
    micHpfNode = audioCtx.createBiquadFilter();
    micHpfNode.type = 'highpass';
    micHpfNode.frequency.value = 80;
    micHpfNode.Q.value = 0.7;

    // Wire the chain. micInputGain comes BEFORE the rest so cutting it leaves
    // the delay buffer intact (matching prerecorded masterVol behavior).
    sourceNode.connect(micHpfNode);
    micHpfNode.connect(micInputGain);
    micInputGain.connect(micGainNode);
    micGainNode.connect(micLpfNode);
    micLpfNode.connect(micDistNode);
    micDistNode.connect(delaySubsystem.input);

    bindParams();
    started = true;
    return { ok: true };
  }

  function bindParams() {
    PARAMS.byName('micVol').apply       = (mapped) => { if (micInputGain) micInputGain.gain.value = mapped; };
    PARAMS.byName('micGain').apply      = (mapped) => { if (micGainNode) micGainNode.gain.value = mapped; };
    PARAMS.byName('micLpfFreq').apply   = (mapped) => { if (micLpfNode) micLpfNode.frequency.value = mapped; };
    PARAMS.byName('micDist').apply      = (mapped) => {
      if (micDistNode) micDistNode.curve = makeSoftClipCurve(mapped);
    };
    PARAMS.byName('micDelayWet').apply   = (mapped) => { if (delaySubsystem) delaySubsystem.setDelayWet(mapped); };
    PARAMS.byName('micDelayTime').apply  = (mapped) => { if (delaySubsystem) delaySubsystem.setDelayTime(mapped); };
    PARAMS.byName('micPreserve').apply   = (mapped) => { if (delaySubsystem) delaySubsystem.setPreserve(mapped); };
    PARAMS.byName('micFbkLevel').apply   = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackLevel(mapped); };
    PARAMS.byName('micFbkHpf').apply     = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackHpf(mapped); };
    PARAMS.byName('micFbkNoise').apply   = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackNoise(mapped); };
    PARAMS.byName('micFbkSine').apply    = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackSine(mapped); };
    PARAMS.byName('micFbkSineHz').apply  = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackSineHz(mapped); };
    PARAMS.byName('micFbkBalance').apply = (mapped) => { if (delaySubsystem) delaySubsystem.setFeedbackBalance(mapped); };
    PARAMS.byName('micCutoffBase').apply     = (m) => { if (delaySubsystem) delaySubsystem.setCutoffBase(m); };
    PARAMS.byName('micResonance').apply      = (m) => { if (delaySubsystem) delaySubsystem.setResonance(m); };
    PARAMS.byName('micPanRange').apply       = (m) => { if (delaySubsystem) delaySubsystem.setPanRange(m); };
    PARAMS.byName('micAmpRange').apply       = (m) => { if (delaySubsystem) delaySubsystem.setAmpRange(m); };
    PARAMS.byName('micLfoSpeed').apply       = (m) => { if (delaySubsystem) delaySubsystem.setLfoSpeed(m); };
    PARAMS.byName('micDensity').apply        = (m) => { if (delaySubsystem) delaySubsystem.setDensity(m); };
    PARAMS.byName('micGrainDurScale').apply  = (m) => { if (delaySubsystem) delaySubsystem.setGrainDurScale(m); };
    PARAMS.byName('micSoftClipDrive').apply  = (m) => { if (delaySubsystem) delaySubsystem.setSoftClipDrive(m); };
    PARAMS.byName('micRevWet').apply    = (mapped) => {
      if (micReverbWetGain) micReverbWetGain.gain.value = mapped;
      if (micReverbDryGain) micReverbDryGain.gain.value = 1 - mapped;
    };
    PARAMS.byName('micRevDecay').apply  = (mapped) => {
      if (Math.abs(mapped - lastMicReverbDecay) > 0.1) {
        if (micReverbNode) micReverbNode.buffer = makeReverbImpulse(audioCtx, mapped);
        lastMicReverbDecay = mapped;
      }
    };
  }

  function isStarted() { return started; }

  function setMuted(m) {
    if (muteGate) {
      muteGate.gain.value = m ? 0 : 1;
    }
  }

  function tick() {
    if (delaySubsystem && delaySubsystem.updateLfos) delaySubsystem.updateLfos();
  }

  return { start, isStarted, setMuted, makeSoftClipCurve, tick };
})();
