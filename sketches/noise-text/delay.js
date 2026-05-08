// delay.js — granular Carter's Delay factory.
// Each call to Delay.create(ctx) returns a Promise of an independent instance
// (loads grains-worklet.js on first call; subsequent calls reuse the module).
const Delay = (() => {
  let workletLoadPromise = null;

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

  async function ensureWorklet(ctx) {
    if (!workletLoadPromise) {
      workletLoadPromise = ctx.audioWorklet.addModule('grains-worklet.js');
    }
    await workletLoadPromise;
  }

  async function create(ctx) {
    await ensureWorklet(ctx);

    // Configurable state — read by updateLfos() each frame.
    let cutoffBaseHz = 4000;
    let resonanceQ   = 0.7;
    let panRange     = 0.7;
    let ampRange     = 1.0;
    let lfoSpeed     = 0.5;
    let lfoVariance  = 0.5;

    const input = ctx.createGain();
    input.gain.value = 1;

    const grainsWorkletNode = new AudioWorkletNode(ctx, 'carters-grains', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [16],
    });
    input.connect(grainsWorkletNode);

    const grainsSplitter = ctx.createChannelSplitter(16);
    grainsWorkletNode.connect(grainsSplitter);

    const voicesSum = ctx.createGain();
    voicesSum.gain.value = 1;

    const voiceFilters = [];
    const voicePanners = [];
    const voiceAmpGains = [];
    for (let v = 0; v < 16; v++) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 5000;
      filter.Q.value = 0.7;
      const panner = ctx.createStereoPanner();
      const ampGain = ctx.createGain();
      ampGain.gain.value = 0.5;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      grainsSplitter.connect(filter, v, 0);
      filter.connect(panner);
      panner.connect(ampGain);
      ampGain.connect(analyser);
      analyser.connect(voicesSum);
      voiceFilters.push(filter);
      voicePanners.push(panner);
      voiceAmpGains.push(ampGain);
    }

    const dryPassthru = ctx.createGain(); dryPassthru.gain.value = 1;
    const dryWetSum = ctx.createGain(); dryWetSum.gain.value = 1;
    input.connect(dryPassthru);
    dryPassthru.connect(dryWetSum);

    const delayWetGain = ctx.createGain();
    delayWetGain.gain.value = 0;
    voicesSum.connect(delayWetGain);
    delayWetGain.connect(dryWetSum);

    const pinkNoiseSource = ctx.createBufferSource();
    pinkNoiseSource.buffer = makePinkNoiseBuffer(ctx);
    pinkNoiseSource.loop = true;
    const pinkNoiseGain = ctx.createGain(); pinkNoiseGain.gain.value = 0;
    pinkNoiseSource.connect(pinkNoiseGain);
    pinkNoiseSource.start();

    const sineOsc = ctx.createOscillator();
    sineOsc.type = 'sine';
    sineOsc.frequency.value = 110;
    const sineGain = ctx.createGain(); sineGain.gain.value = 0;
    sineOsc.connect(sineGain);
    sineOsc.start();

    const fbkBalance = ctx.createStereoPanner();
    const fbkInjectionSum = ctx.createGain(); fbkInjectionSum.gain.value = 1;
    const fbkHpf = ctx.createBiquadFilter();
    fbkHpf.type = 'highpass';
    fbkHpf.frequency.value = 80;
    fbkHpf.Q.value = 0.7;
    const fbkSoftClip = ctx.createWaveShaper();
    fbkSoftClip.curve = makeSoftClipCurve(0.05);
    fbkSoftClip.oversample = '2x';
    const fbkLpf = ctx.createBiquadFilter();
    fbkLpf.type = 'lowpass';
    fbkLpf.frequency.value = 4000;
    fbkLpf.Q.value = 0.5;
    const fbkGain = ctx.createGain(); fbkGain.gain.value = 0;
    const preserveGain = ctx.createGain(); preserveGain.gain.value = 0;

    voicesSum.connect(fbkBalance);
    fbkBalance.connect(fbkInjectionSum);
    pinkNoiseGain.connect(fbkInjectionSum);
    sineGain.connect(fbkInjectionSum);
    fbkInjectionSum.connect(fbkHpf);
    fbkHpf.connect(fbkSoftClip);
    fbkSoftClip.connect(fbkLpf);
    fbkLpf.connect(fbkGain);
    fbkGain.connect(preserveGain);
    preserveGain.connect(input);

    const output = ctx.createGain();
    output.gain.value = 1;
    dryWetSum.connect(output);

    function updateLfos() {
      if (typeof noise !== 'function') return;
      const t60 = ctx.currentTime * 60;
      for (let v = 0; v < 16; v++) {
        const voiceFactor = (v + 1) * (1 + lfoVariance);
        const baseScale = lfoSpeed * voiceFactor / 25000;
        const panX    = (1 * baseScale * t60) + v * 17;
        const ampX    = (2 * baseScale * t60) + v * 31 + 1000;
        const cutoffX = (3 * baseScale * t60) + v * 47 + 2000;
        const resX    = (4 * baseScale * t60) + v * 61 + 3000;
        const panN    = noise(panX);
        const ampN    = noise(ampX);
        const cutoffN = noise(cutoffX);
        const resN    = noise(resX);
        voicePanners[v].pan.value = (panN * 2 - 1) * panRange;
        voiceAmpGains[v].gain.value = 0.3 + ampN * ampRange * 0.7;
        const cutoffHz = Math.max(80, cutoffBaseHz * (0.5 + cutoffN));
        voiceFilters[v].frequency.value = Math.min(cutoffHz, 12000);
        voiceFilters[v].Q.value = resN * resonanceQ;
      }
    }

    return {
      input, output,
      setDelayWet:        (m) => { delayWetGain.gain.value = m; dryPassthru.gain.value = 1 - m; },
      setDelayTime:       (s) => {
        const p = grainsWorkletNode.parameters.get('beatDur');
        if (p) p.setTargetAtTime(s, ctx.currentTime, 0.05);
      },
      setPreserve:        (m) => { preserveGain.gain.value = m; },
      setFeedbackLevel:   (m) => { fbkGain.gain.value = m; },
      setFeedbackHpf:     (m) => { fbkHpf.frequency.value = m; },
      setFeedbackNoise:   (m) => { pinkNoiseGain.gain.value = m; },
      setFeedbackSine:    (m) => { sineGain.gain.value = m; },
      setFeedbackSineHz:  (m) => { sineOsc.frequency.setTargetAtTime(m, ctx.currentTime, 0.02); },
      setFeedbackBalance: (m) => { fbkBalance.pan.value = m; },
      setSoftClipDrive:   (m) => { fbkSoftClip.curve = makeSoftClipCurve(m); },
      setCutoffBase:      (hz) => { cutoffBaseHz = hz; },
      setResonance:       (q) => { resonanceQ = q; },
      setPanRange:        (m) => { panRange = m; },
      setAmpRange:        (m) => { ampRange = m; },
      setLfoSpeed:        (m) => { lfoSpeed = m; },
      setLfoVariance:     (m) => { lfoVariance = m; },
      setDensity:         (m) => {
        const p = grainsWorkletNode.parameters.get('densityScale');
        if (p) p.setTargetAtTime(m, ctx.currentTime, 0.1);
      },
      setGrainDurScale:   (m) => {
        const p = grainsWorkletNode.parameters.get('durScale');
        if (p) p.setTargetAtTime(m, ctx.currentTime, 0.1);
      },
      updateLfos,
    };
  }

  return { create };
})();
