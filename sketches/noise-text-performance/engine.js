const ENGINE = (() => {
  let active = false;
  let startFrame = 0;
  let lastTick = { normInt: 0, sine: 0, perlin: 0 };

  function activate() {
    active = true;
    startFrame = (typeof frameCount !== 'undefined') ? frameCount : 0;
  }

  function deactivate() {
    active = false;
    lastTick = { normInt: 0, sine: 0, perlin: 0 };
  }

  function tick() {
    if (!active) return lastTick;
    const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
    const f = fc - startFrame;
    const sineWave = Math.sin(f * 0.0005 - Math.PI / 2);
    const perlinNoise = (typeof noise === 'function') ? noise(f * 0.005) * 2 - 1 : 0;
    const noiseLevel = Math.min(1, Math.max(0, f / 1000)) * 0.05;
    const combined = sineWave + (perlinNoise - sineWave) * noiseLevel;
    const normInt = (combined + 1) * 0.5;
    lastTick = { normInt, sine: sineWave, perlin: perlinNoise };
    return lastTick;
  }

  return { activate, deactivate, tick, isActive: () => active };
})();
