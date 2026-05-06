// mic.js — live microphone processing chain. Bank 3.
// Carter-flavored multi-tap delay subsystem added: 4 scrambled taps, per-tap
// LFO pan + cutoff modulation, saturating feedback patchcord (HPF / pink noise /
// sine injection / soft-clip), convolver reverb tail.
const MIC = (() => {
  let audioCtx = null;
  let micStream = null;
  let started = false;
  let muteGate = null;

  // Audio nodes (created in start()).
  let sourceNode = null;
  let micGainNode = null;
  let micLpfNode = null;
  let micDistNode = null;
  let outputGainNode = null;

  // Delay subsystem nodes
  let dryPassthruGain = null;
  let delayInputBus = null;
  let tapsSumGain = null;
  let delayWetGain = null;
  let dryWetSum = null;
  let tapDelay = [];
  let tapFilter = [];
  let tapPanner = [];
  let tapGain = [];
  let tapPanLfo = [];
  let tapPanLfoDepth = [];
  let tapCutoffLfo = [];
  let tapCutoffLfoDepth = [];
  let tapCutoffOffset = [];

  // Feedback patchcord nodes
  let fbkBalance = null;
  let fbkInjectionSum = null;
  let fbkHpf = null;
  let fbkSoftClip = null;
  let fbkGain = null;
  let preserveGain = null;
  let pinkNoiseSource = null;
  let pinkNoiseGain = null;
  let sineOscNode = null;
  let sineGain = null;

  // Reverb tail
  let micReverbNode = null;
  let micReverbDryGain = null;
  let micReverbWetGain = null;
  let lastMicReverbDecay = -1;

  // Tap layout (deterministic but varied)
  const TAP_COUNT = 4;
  const TAP_SCRAMBLE = [1.0, 1.51, 0.73, 1.27];
  const TAP_PAN_LFO_HZ    = [0.13, 0.21, 0.31, 0.17];
  const TAP_CUTOFF_LFO_HZ = [0.07, 0.18, 0.11, 0.23];

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

  function makePinkNoiseBuffer(ctx) {
    const seconds = 5;
    const length = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
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

    // ---------- Carter-flavored delay subsystem ----------
    const ctx = audioCtx;

    // Pink noise (loop a pre-generated buffer).
    const pinkBuffer = makePinkNoiseBuffer(ctx);
    pinkNoiseSource = ctx.createBufferSource();
    pinkNoiseSource.buffer = pinkBuffer;
    pinkNoiseSource.loop = true;
    pinkNoiseGain = ctx.createGain();
    pinkNoiseGain.gain.value = 0;
    pinkNoiseSource.connect(pinkNoiseGain);

    // Sine injection.
    sineOscNode = ctx.createOscillator();
    sineOscNode.type = 'sine';
    sineOscNode.frequency.value = 110;
    sineGain = ctx.createGain();
    sineGain.gain.value = 0;
    sineOscNode.connect(sineGain);

    // Sum point (delay input + feedback).
    delayInputBus = ctx.createGain();
    delayInputBus.gain.value = 1;

    // Dry passthru and dry/wet summer.
    dryPassthruGain = ctx.createGain();
    dryPassthruGain.gain.value = 1;
    dryWetSum = ctx.createGain();
    dryWetSum.gain.value = 1;

    // tapsSumGain initialized before the loop so taps can connect into it.
    tapsSumGain = ctx.createGain();
    tapsSumGain.gain.value = 1;

    // Per-tap construction.
    tapDelay = [];
    tapFilter = [];
    tapPanner = [];
    tapGain = [];
    tapPanLfo = [];
    tapPanLfoDepth = [];
    tapCutoffLfo = [];
    tapCutoffLfoDepth = [];
    tapCutoffOffset = [];
    for (let i = 0; i < TAP_COUNT; i++) {
      const d = ctx.createDelay(3.0);
      d.delayTime.value = 0.5 * TAP_SCRAMBLE[i];

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 5000;
      f.Q.value = 0.7;

      const cutoffOffset = ctx.createConstantSource();
      cutoffOffset.offset.value = 5000;
      cutoffOffset.connect(f.frequency);
      cutoffOffset.start();

      const cLfo = ctx.createOscillator();
      cLfo.type = 'triangle';
      cLfo.frequency.value = TAP_CUTOFF_LFO_HZ[i];
      const cLfoDepth = ctx.createGain();
      cLfoDepth.gain.value = 2500;
      cLfo.connect(cLfoDepth);
      cLfoDepth.connect(f.frequency);
      cLfo.start();

      const p = ctx.createStereoPanner();

      const pLfo = ctx.createOscillator();
      pLfo.type = 'triangle';
      pLfo.frequency.value = TAP_PAN_LFO_HZ[i];
      const pLfoDepth = ctx.createGain();
      pLfoDepth.gain.value = 0.7;
      pLfo.connect(pLfoDepth);
      pLfoDepth.connect(p.pan);
      pLfo.start();

      const g = ctx.createGain();
      g.gain.value = 1.0 / TAP_COUNT;

      delayInputBus.connect(d);
      d.connect(f);
      f.connect(p);
      p.connect(g);
      g.connect(tapsSumGain);

      tapDelay.push(d);
      tapFilter.push(f);
      tapPanner.push(p);
      tapGain.push(g);
      tapPanLfo.push(pLfo);
      tapPanLfoDepth.push(pLfoDepth);
      tapCutoffLfo.push(cLfo);
      tapCutoffLfoDepth.push(cLfoDepth);
      tapCutoffOffset.push(cutoffOffset);
    }

    // Delay wet level.
    delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0;
    tapsSumGain.connect(delayWetGain);
    delayWetGain.connect(dryWetSum);

    // Dry passthru into dryWetSum.
    dryPassthruGain.connect(dryWetSum);

    // Feedback patchcord.
    fbkBalance = ctx.createStereoPanner();
    fbkInjectionSum = ctx.createGain();
    fbkInjectionSum.gain.value = 1;
    fbkHpf = ctx.createBiquadFilter();
    fbkHpf.type = 'highpass';
    fbkHpf.frequency.value = 80;
    fbkHpf.Q.value = 0.7;
    fbkSoftClip = ctx.createWaveShaper();
    fbkSoftClip.curve = makeSoftClipCurve(0.5);
    fbkSoftClip.oversample = '2x';
    fbkGain = ctx.createGain();
    fbkGain.gain.value = 0;
    preserveGain = ctx.createGain();
    preserveGain.gain.value = 0;

    tapsSumGain.connect(fbkBalance);
    fbkBalance.connect(fbkInjectionSum);
    pinkNoiseGain.connect(fbkInjectionSum);
    sineGain.connect(fbkInjectionSum);
    fbkInjectionSum.connect(fbkHpf);
    fbkHpf.connect(fbkSoftClip);
    fbkSoftClip.connect(fbkGain);
    fbkGain.connect(preserveGain);
    preserveGain.connect(delayInputBus);

    // Reverb tail.
    micReverbNode = ctx.createConvolver();
    micReverbNode.buffer = makeReverbImpulse(ctx, 2.0);
    micReverbDryGain = ctx.createGain();
    micReverbWetGain = ctx.createGain();
    micReverbDryGain.gain.value = 1;
    micReverbWetGain.gain.value = 0;

    dryWetSum.connect(micReverbDryGain);
    dryWetSum.connect(micReverbNode);
    micReverbNode.connect(micReverbWetGain);
    micReverbDryGain.connect(outputGainNode);
    micReverbWetGain.connect(outputGainNode);

    // Start oscillators / noise loops.
    pinkNoiseSource.start();
    sineOscNode.start();

    // Wire the chain.
    sourceNode.connect(micGainNode);
    micGainNode.connect(micLpfNode);
    micLpfNode.connect(micDistNode);
    // Splice the delay subsystem in between distortion and output.
    micDistNode.connect(dryPassthruGain);
    micDistNode.connect(delayInputBus);
    muteGate = audioCtx.createGain();
    muteGate.gain.value = 0; // start muted; switch CC 32 unmutes
    outputGainNode.connect(muteGate);
    muteGate.connect(audioCtx.destination);

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
    PARAMS.byName('micDelayWet').apply  = (mapped) => { if (delayWetGain) delayWetGain.gain.value = mapped; };
    PARAMS.byName('micDelayTime').apply = (mapped) => {
      if (!tapDelay.length) return;
      const now = audioCtx.currentTime;
      for (let i = 0; i < tapDelay.length; i++) {
        tapDelay[i].delayTime.setTargetAtTime(mapped * TAP_SCRAMBLE[i], now, 0.05);
      }
    };
    PARAMS.byName('micPreserve').apply  = (mapped) => { if (preserveGain) preserveGain.gain.value = mapped; };
    PARAMS.byName('micFbkLevel').apply  = (mapped) => { if (fbkGain) fbkGain.gain.value = mapped; };
    PARAMS.byName('micFbkHpf').apply    = (mapped) => { if (fbkHpf) fbkHpf.frequency.value = mapped; };
    PARAMS.byName('micFbkNoise').apply  = (mapped) => { if (pinkNoiseGain) pinkNoiseGain.gain.value = mapped; };
    PARAMS.byName('micFbkSine').apply   = (mapped) => { if (sineGain) sineGain.gain.value = mapped; };
    PARAMS.byName('micFbkSineHz').apply = (mapped) => {
      if (sineOscNode) {
        const now = audioCtx.currentTime;
        sineOscNode.frequency.setTargetAtTime(mapped, now, 0.02);
      }
    };
    PARAMS.byName('micFbkBalance').apply = (mapped) => { if (fbkBalance) fbkBalance.pan.value = mapped; };
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

  return { start, isStarted, setMuted, makeSoftClipCurve };
})();
