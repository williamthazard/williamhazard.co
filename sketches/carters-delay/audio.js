// audio.js — main-thread audio graph for Carter's Delay.
// 16-voice granular synthesis via AudioWorklet + per-voice LFOs + feedback patchcord.

const AUDIO = (() => {

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function makeSoftClipCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
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
    const sr = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sr * decaySeconds));
    const buffer = ctx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
      }
    }
    return buffer;
  }

  // ─── LFO frequency tables (deterministic per-voice rates) ─────────────────

  const PAN_LFO_HZ_BASE    = [0.43, 0.21, 0.61, 0.13, 0.27, 0.71, 0.15, 0.31, 0.45, 0.19, 0.51, 0.23, 0.37, 0.59, 0.17, 0.29];
  const AMP_LFO_HZ_BASE    = [0.11, 0.31, 0.07, 0.41, 0.15, 0.27, 0.53, 0.13, 0.39, 0.21, 0.47, 0.09, 0.33, 0.17, 0.55, 0.25];
  const CUTOFF_LFO_HZ_BASE = [0.07, 0.13, 0.23, 0.37, 0.11, 0.31, 0.43, 0.17, 0.27, 0.41, 0.19, 0.29, 0.53, 0.09, 0.47, 0.39];
  const RES_LFO_HZ_BASE    = [0.05, 0.17, 0.29, 0.11, 0.41, 0.07, 0.31, 0.19, 0.13, 0.37, 0.23, 0.43, 0.59, 0.15, 0.51, 0.21];

  // ─── Module-scope node references ─────────────────────────────────────────

  let audioCtx = null;
  let micStream = null;
  let started = false;

  // Pre-FX chain
  let sourceNode        = null;
  let micMuteGate       = null; // source-level mic gate (setMicMuted)
  let micInputGain      = null; // micVol knob
  let preLpfNode        = null;
  let preDistNode       = null;
  let dryPassthru       = null;
  let inputAnalyser     = null; // reads post-preLpf, pre-delay (for viz)

  // Granular worklet
  let grainsWorkletNode = null;
  let delayInputBus     = null; // upstream of the worklet (also receives feedback)

  // Per-voice processing chains (16 each)
  const voiceFilters    = [];
  const voicePanners    = [];
  const voiceAmpGains   = [];
  const voiceAnalysers  = [];

  // Per-voice LFOs (16 each)
  const panLfos         = [];
  const panLfoDepths    = [];
  const ampLfos         = [];
  const ampLfoDepths    = [];
  const ampLfoOffsets   = []; // ConstantSource for amp LFO bias
  const cutoffLfos      = [];
  const cutoffLfoDepths = [];
  const cutoffOffsets   = []; // ConstantSource for cutoff center
  const resLfos         = [];
  const resLfoDepths    = [];

  // Mix + reverb
  let voicesSum         = null;
  let dryWetSum         = null;
  let reverbConvolver   = null;
  let reverbDryGain     = null;
  let reverbWetGain     = null;
  let lastReverbDecay   = -1;

  // Output
  let outputGainNode    = null;
  let outputMuteGate    = null; // output mute switch

  // Feedback patchcord
  let fbkBalance        = null;
  let fbkInjectionSum   = null;
  let fbkHpf            = null;
  let fbkSoftClip       = null;
  let fbkGain           = null;
  let preserveGain      = null;
  let pinkNoiseSource   = null;
  let pinkNoiseGain     = null;
  let sineOsc           = null;
  let sineGain          = null;

  // ─── start() ──────────────────────────────────────────────────────────────

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

    // Load the granular worklet.
    await audioCtx.audioWorklet.addModule('grains-worklet.js');

    // ── Pre-FX chain ────────────────────────────────────────────────────────

    sourceNode = audioCtx.createMediaStreamSource(micStream);

    // Source-level mic mute gate — cuts fresh audio without clearing the delay buffer.
    micMuteGate = audioCtx.createGain();
    micMuteGate.gain.value = 1; // start open; setMicMuted controls this

    // micVol knob — operator-controlled input gain.
    micInputGain = audioCtx.createGain();
    micInputGain.gain.value = 0; // silent by default (micVol default = 0)

    // Pre-LPF (preLpf knob).
    preLpfNode = audioCtx.createBiquadFilter();
    preLpfNode.type = 'lowpass';
    preLpfNode.frequency.value = 20000;
    preLpfNode.Q.value = 0.5;

    // Pre-distortion (preDist knob).
    preDistNode = audioCtx.createWaveShaper();
    preDistNode.curve = makeSoftClipCurve(0);
    preDistNode.oversample = '2x';

    // Input analyser (visualisation of the clean mic signal).
    inputAnalyser = audioCtx.createAnalyser();
    inputAnalyser.fftSize = 1024;
    inputAnalyser.smoothingTimeConstant = 0.8;

    // Dry passthru — goes directly to dryWetSum.
    dryPassthru = audioCtx.createGain();
    dryPassthru.gain.value = 1;

    // dryWetSum — collects dry + wet (voices) before reverb.
    dryWetSum = audioCtx.createGain();
    dryWetSum.gain.value = 1;

    // Delay input bus — feeds the worklet (also receives feedback).
    delayInputBus = audioCtx.createGain();
    delayInputBus.gain.value = 1;

    // Wire pre-FX chain.
    sourceNode.connect(micMuteGate);
    micMuteGate.connect(micInputGain);
    micInputGain.connect(preLpfNode);
    preLpfNode.connect(preDistNode);
    preDistNode.connect(inputAnalyser);
    preDistNode.connect(dryPassthru);
    preDistNode.connect(delayInputBus);
    dryPassthru.connect(dryWetSum);

    // ── Granular worklet node ────────────────────────────────────────────────

    grainsWorkletNode = new AudioWorkletNode(audioCtx, 'carters-grains', {
      numberOfInputs: 1,
      numberOfOutputs: 16,
      outputChannelCount: new Array(16).fill(1),
    });

    delayInputBus.connect(grainsWorkletNode);

    // ── Per-voice processing chains ──────────────────────────────────────────

    voicesSum = audioCtx.createGain();
    voicesSum.gain.value = 1;

    for (let v = 0; v < 16; v++) {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 5000;
      filter.Q.value = 0.7;

      const panner = audioCtx.createStereoPanner();

      const ampGain = audioCtx.createGain();
      ampGain.gain.value = 0; // LFO drives this

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;

      // Worklet output v → filter → panner → ampGain → analyser → voicesSum
      grainsWorkletNode.connect(filter, v, 0);
      filter.connect(panner);
      panner.connect(ampGain);
      ampGain.connect(analyser);
      analyser.connect(voicesSum);

      voiceFilters.push(filter);
      voicePanners.push(panner);
      voiceAmpGains.push(ampGain);
      voiceAnalysers.push(analyser);
    }

    voicesSum.connect(dryWetSum);

    // ── Per-voice LFOs ───────────────────────────────────────────────────────

    for (let v = 0; v < 16; v++) {
      // Pan LFO: triangle → panLfoDepth(gain=panRange) → panner.pan
      // Triangle output is -1..1; scaled by panRange gives (-panRange, +panRange).
      const panLfo = audioCtx.createOscillator();
      panLfo.type = 'triangle';
      panLfo.frequency.value = PAN_LFO_HZ_BASE[v];

      const panLfoDepth = audioCtx.createGain();
      panLfoDepth.gain.value = 0.7; // default panRange

      panLfo.connect(panLfoDepth);
      panLfoDepth.connect(voicePanners[v].pan);

      panLfos.push(panLfo);
      panLfoDepths.push(panLfoDepth);

      // Amp LFO: ConstantSource(offset) + triangle(depth) → ampGain.gain
      // Output range: 0..ampRange. offset = ampRange*0.5, depth = ampRange*0.5.
      const ampLfoOffset = audioCtx.createConstantSource();
      ampLfoOffset.offset.value = 0.25; // default ampRange*0.5 = 0.5*0.5

      const ampLfo = audioCtx.createOscillator();
      ampLfo.type = 'triangle';
      ampLfo.frequency.value = AMP_LFO_HZ_BASE[v];

      const ampLfoDepth = audioCtx.createGain();
      ampLfoDepth.gain.value = 0.25; // default ampRange*0.5

      ampLfoOffset.connect(voiceAmpGains[v].gain);
      ampLfo.connect(ampLfoDepth);
      ampLfoDepth.connect(voiceAmpGains[v].gain);

      ampLfos.push(ampLfo);
      ampLfoDepths.push(ampLfoDepth);
      ampLfoOffsets.push(ampLfoOffset);

      // Cutoff LFO: ConstantSource(cutoffBase) + triangle(~3000) → filter.frequency
      const cutoffOffset = audioCtx.createConstantSource();
      cutoffOffset.offset.value = 5000; // default cutoffBase

      const cutoffLfo = audioCtx.createOscillator();
      cutoffLfo.type = 'triangle';
      cutoffLfo.frequency.value = CUTOFF_LFO_HZ_BASE[v];

      const cutoffLfoDepth = audioCtx.createGain();
      cutoffLfoDepth.gain.value = 3000;

      cutoffOffset.connect(voiceFilters[v].frequency);
      cutoffLfo.connect(cutoffLfoDepth);
      cutoffLfoDepth.connect(voiceFilters[v].frequency);

      cutoffLfos.push(cutoffLfo);
      cutoffLfoDepths.push(cutoffLfoDepth);
      cutoffOffsets.push(cutoffOffset);

      // Resonance LFO: triangle(depth=resonance) → filter.Q
      const resLfo = audioCtx.createOscillator();
      resLfo.type = 'triangle';
      resLfo.frequency.value = RES_LFO_HZ_BASE[v];

      const resLfoDepth = audioCtx.createGain();
      resLfoDepth.gain.value = 0.9; // default resonance = 0.3 * 3 range

      resLfo.connect(resLfoDepth);
      resLfoDepth.connect(voiceFilters[v].Q);

      resLfos.push(resLfo);
      resLfoDepths.push(resLfoDepth);
    }

    // ── Feedback patchcord ───────────────────────────────────────────────────
    // voicesSum → fbkBalance → fbkInjectionSum (+ noise + sine) → fbkHpf
    //   → fbkSoftClip → fbkGain → preserveGain → delayInputBus

    fbkBalance = audioCtx.createStereoPanner();
    fbkBalance.pan.value = 0;

    fbkInjectionSum = audioCtx.createGain();
    fbkInjectionSum.gain.value = 1;

    // Pink noise source.
    pinkNoiseSource = audioCtx.createBufferSource();
    pinkNoiseSource.buffer = makePinkNoiseBuffer(audioCtx);
    pinkNoiseSource.loop = true;
    pinkNoiseGain = audioCtx.createGain();
    pinkNoiseGain.gain.value = 0;
    pinkNoiseSource.connect(pinkNoiseGain);

    // Sine oscillator.
    sineOsc = audioCtx.createOscillator();
    sineOsc.type = 'sine';
    sineOsc.frequency.value = 110;
    sineGain = audioCtx.createGain();
    sineGain.gain.value = 0;
    sineOsc.connect(sineGain);

    fbkHpf = audioCtx.createBiquadFilter();
    fbkHpf.type = 'highpass';
    fbkHpf.frequency.value = 80;
    fbkHpf.Q.value = 0.7;

    fbkSoftClip = audioCtx.createWaveShaper();
    fbkSoftClip.curve = makeSoftClipCurve(0.3);
    fbkSoftClip.oversample = '2x';

    fbkGain = audioCtx.createGain();
    fbkGain.gain.value = 0;

    preserveGain = audioCtx.createGain();
    preserveGain.gain.value = 0;

    voicesSum.connect(fbkBalance);
    fbkBalance.connect(fbkInjectionSum);
    pinkNoiseGain.connect(fbkInjectionSum);
    sineGain.connect(fbkInjectionSum);
    fbkInjectionSum.connect(fbkHpf);
    fbkHpf.connect(fbkSoftClip);
    fbkSoftClip.connect(fbkGain);
    fbkGain.connect(preserveGain);
    preserveGain.connect(delayInputBus);

    // ── Reverb tail ──────────────────────────────────────────────────────────

    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = makeReverbImpulse(audioCtx, 2.0);

    reverbDryGain = audioCtx.createGain();
    reverbDryGain.gain.value = 1;

    reverbWetGain = audioCtx.createGain();
    reverbWetGain.gain.value = 0;

    dryWetSum.connect(reverbDryGain);
    dryWetSum.connect(reverbConvolver);
    reverbConvolver.connect(reverbWetGain);

    // ── Output ───────────────────────────────────────────────────────────────

    outputGainNode = audioCtx.createGain();
    outputGainNode.gain.value = 0; // masterVol default = 0

    outputMuteGate = audioCtx.createGain();
    outputMuteGate.gain.value = 1; // open; setOutputMuted controls this

    reverbDryGain.connect(outputGainNode);
    reverbWetGain.connect(outputGainNode);
    outputGainNode.connect(outputMuteGate);
    outputMuteGate.connect(audioCtx.destination);

    // ── Wire up params + start LFOs ─────────────────────────────────────────

    bindParams();
    startLfos();

    started = true;
    return { ok: true };
  }

  // ─── bindParams() ─────────────────────────────────────────────────────────

  function bindParams() {
    PARAMS.byName('micVol').apply = (m) => {
      if (micInputGain) micInputGain.gain.value = m;
    };
    PARAMS.byName('masterVol').apply = (m) => {
      if (outputGainNode) outputGainNode.gain.value = m;
    };
    PARAMS.byName('bpm').apply = (m) => {
      if (grainsWorkletNode) {
        // beatDur = 60 / bpm
        grainsWorkletNode.parameters.get('beatDur').setTargetAtTime(60 / m, audioCtx.currentTime, 0.05);
      }
    };
    PARAMS.byName('modAmount').apply = (m) => {
      // modAmount is available for future use (e.g. depth multiplier); no-op for v1.
    };
    PARAMS.byName('preLpf').apply = (m) => {
      if (preLpfNode) preLpfNode.frequency.value = m;
    };
    PARAMS.byName('preDist').apply = (m) => {
      if (preDistNode) preDistNode.curve = makeSoftClipCurve(m);
    };
    PARAMS.byName('reverbWet').apply = (m) => {
      if (reverbWetGain) reverbWetGain.gain.value = m;
      if (reverbDryGain) reverbDryGain.gain.value = 1 - m;
    };
    PARAMS.byName('reverbDecay').apply = (m) => {
      if (Math.abs(m - lastReverbDecay) > 0.1) {
        if (reverbConvolver) reverbConvolver.buffer = makeReverbImpulse(audioCtx, m);
        lastReverbDecay = m;
      }
    };
    PARAMS.byName('density').apply = (m) => {
      if (grainsWorkletNode) {
        grainsWorkletNode.parameters.get('densityScale').setTargetAtTime(m, audioCtx.currentTime, 0.1);
      }
    };
    PARAMS.byName('grainDurScale').apply = (m) => {
      if (grainsWorkletNode) {
        grainsWorkletNode.parameters.get('durScale').setTargetAtTime(m, audioCtx.currentTime, 0.1);
      }
    };
    PARAMS.byName('cutoffBase').apply = (m) => {
      for (const offset of cutoffOffsets) offset.offset.value = m;
    };
    PARAMS.byName('resonance').apply = (m) => {
      for (const filter of voiceFilters) filter.Q.value = m;
    };
    PARAMS.byName('panRange').apply = (m) => {
      for (const depth of panLfoDepths) depth.gain.value = m;
    };
    PARAMS.byName('ampRange').apply = (m) => {
      for (const depth of ampLfoDepths) depth.gain.value = m * 0.5;
      for (const offset of ampLfoOffsets) offset.offset.value = m * 0.5;
    };
    PARAMS.byName('lfoSpeed').apply = (m) => {
      const now = audioCtx.currentTime;
      for (let v = 0; v < 16; v++) {
        panLfos[v].frequency.setTargetAtTime(PAN_LFO_HZ_BASE[v] * m, now, 0.05);
        ampLfos[v].frequency.setTargetAtTime(AMP_LFO_HZ_BASE[v] * m, now, 0.05);
        cutoffLfos[v].frequency.setTargetAtTime(CUTOFF_LFO_HZ_BASE[v] * m, now, 0.05);
        resLfos[v].frequency.setTargetAtTime(RES_LFO_HZ_BASE[v] * m, now, 0.05);
      }
    };
    PARAMS.byName('lfoVariance').apply = (m) => { /* leave empty for v1 */ };
    PARAMS.byName('fbkLevel').apply = (m) => {
      if (fbkGain) fbkGain.gain.value = m;
    };
    PARAMS.byName('preserve').apply = (m) => {
      if (preserveGain) preserveGain.gain.value = m;
    };
    PARAMS.byName('fbkHpf').apply = (m) => {
      if (fbkHpf) fbkHpf.frequency.value = m;
    };
    PARAMS.byName('fbkBalance').apply = (m) => {
      if (fbkBalance) fbkBalance.pan.value = m;
    };
    PARAMS.byName('fbkNoise').apply = (m) => {
      if (pinkNoiseGain) pinkNoiseGain.gain.value = m;
    };
    PARAMS.byName('fbkSine').apply = (m) => {
      if (sineGain) sineGain.gain.value = m;
    };
    PARAMS.byName('fbkSineHz').apply = (m) => {
      if (sineOsc) sineOsc.frequency.setTargetAtTime(m, audioCtx.currentTime, 0.02);
    };
    PARAMS.byName('softClipDrive').apply = (m) => {
      if (fbkSoftClip) fbkSoftClip.curve = makeSoftClipCurve(m);
    };
  }

  // ─── startLfos() ──────────────────────────────────────────────────────────

  let lfoStartTime = 0;

  function startLfos() {
    lfoStartTime = audioCtx.currentTime;
    for (let v = 0; v < 16; v++) {
      panLfos[v].start();
      ampLfos[v].start();
      ampLfoOffsets[v].start();
      cutoffLfos[v].start();
      cutoffOffsets[v].start();
      resLfos[v].start();
    }
    pinkNoiseSource.start();
    sineOsc.start();
  }

  // Triangle wave at phase p in [0,1). Matches Web Audio's triangle:
  // 0 → 0, peaks +1 at 0.25, back to 0 at 0.5, -1 at 0.75, 0 at 1.
  function triangleAtPhase(p) {
    if (p < 0.25) return 4 * p;
    if (p < 0.75) return 2 - 4 * p;
    return -4 + 4 * p;
  }

  // ─── Public controls ──────────────────────────────────────────────────────

  function isStarted() { return started; }

  function setMicMuted(muted) {
    if (micMuteGate) {
      micMuteGate.gain.value = muted ? 0 : 1;
    }
  }

  function setOutputMuted(muted) {
    if (outputMuteGate) {
      outputMuteGate.gain.value = muted ? 0 : 1;
    }
  }

  function getVoiceAnalysers() { return voiceAnalysers; }
  function getInputAnalyser()  { return inputAnalyser; }
  function getInputLevel()     {
    if (!PARAMS.byName('micVol')) return 0;
    return PARAMS.mappedValue(PARAMS.byName('micVol'));
  }

  // Compute the current pan and amp values FROM THE LFO CONFIG, not from
  // AudioParam.value (which returns the intrinsic value 0 — modulators added
  // to a param don't update the .value field). We replicate the LFO math in
  // JS so the visualization mirrors what's actually happening in audio.
  function getVoicePanAndAmp(v) {
    if (!audioCtx || !panLfos[v] || !ampLfos[v]) return { pan: 0, amp: 0 };
    const t = audioCtx.currentTime - lfoStartTime;

    const panFreq = panLfos[v].frequency.value;
    const panDepth = panLfoDepths[v].gain.value;
    const panP = ((t * panFreq) % 1 + 1) % 1;
    const pan = triangleAtPhase(panP) * panDepth;

    const ampFreq = ampLfos[v].frequency.value;
    const ampDepth = ampLfoDepths[v].gain.value;
    const ampOffset = ampLfoOffsets[v].offset.value;
    const ampP = ((t * ampFreq) % 1 + 1) % 1;
    const amp = ampOffset + triangleAtPhase(ampP) * ampDepth;

    return { pan, amp };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    start,
    isStarted,
    setMicMuted,
    setOutputMuted,
    getVoiceAnalysers,
    getInputAnalyser,
    getInputLevel,
    getVoicePanAndAmp,
  };
})();
