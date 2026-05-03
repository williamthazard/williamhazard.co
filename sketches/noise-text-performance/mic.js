// mic.js — live microphone processing chain. Bank 3.
// Carter-flavored delay subsystem is added in a follow-up task; this file
// currently provides only mic input + gain + LPF + distortion + output.
const MIC = (() => {
  let audioCtx = null;
  let micStream = null;
  let started = false;

  // Audio nodes (created in start()).
  let sourceNode = null;
  let micGainNode = null;
  let micLpfNode = null;
  let micDistNode = null;
  let outputGainNode = null;

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

    micGainNode = audioCtx.createGain();
    micGainNode.gain.value = 0; // muted until knobs read

    micLpfNode = audioCtx.createBiquadFilter();
    micLpfNode.type = 'lowpass';
    micLpfNode.frequency.value = 20000;
    micLpfNode.Q.value = 0.5;

    micDistNode = audioCtx.createWaveShaper();
    micDistNode.curve = makeSoftClipCurve(0);
    micDistNode.oversample = '2x';

    outputGainNode = audioCtx.createGain();
    outputGainNode.gain.value = 0; // start silent (Mic Vol default = 0)

    // Wire the chain.
    sourceNode.connect(micGainNode);
    micGainNode.connect(micLpfNode);
    micLpfNode.connect(micDistNode);
    micDistNode.connect(outputGainNode);
    outputGainNode.connect(audioCtx.destination);

    bindParams();
    started = true;
    return { ok: true };
  }

  function bindParams() {
    PARAMS.byName('micVol').apply       = (mapped) => { if (outputGainNode) outputGainNode.gain.value = mapped; };
    PARAMS.byName('micGain').apply      = (mapped) => { if (micGainNode) micGainNode.gain.value = mapped; };
    PARAMS.byName('micLpfFreq').apply   = (mapped) => { if (micLpfNode) micLpfNode.frequency.value = mapped; };
    PARAMS.byName('micDist').apply      = (mapped) => {
      if (micDistNode) micDistNode.curve = makeSoftClipCurve(mapped);
    };
    // The remaining bank-3 params (delay, feedback, reverb) are wired in the
    // delay subsystem task. Until then, their apply() stays as the default no-op.
  }

  function isStarted() { return started; }

  return { start, isStarted, makeSoftClipCurve };
})();
