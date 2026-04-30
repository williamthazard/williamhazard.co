TESTS.test('M1 Intensity at v=0 zeroes all targets', () => {
  const out = MACROS.compute('m1', 0);
  TESTS.assert(out.visualJag === 0);
  TESTS.assert(out.lpfFreq === 0);
  TESTS.assert(out.distortion === 0);
  TESTS.assert(out.reverbWet === 0);
  TESTS.assert(out.jitterAmt === 0);
  TESTS.assert(out.stutterProb === 0);
});

TESTS.test('M1 Intensity at v=1 maxes all targets', () => {
  const out = MACROS.compute('m1', 1);
  TESTS.assert(out.visualJag === 1);
  TESTS.assert(out.lpfFreq === 1);
  TESTS.assert(out.distortion === 1);
  TESTS.assert(out.reverbWet === 1);
  TESTS.assert(out.jitterAmt === 1);
  TESTS.assert(out.stutterProb === 1);
});

TESTS.test('M1 Intensity at v=0.1 (below jitter gate) leaves jitter at 0', () => {
  const out = MACROS.compute('m1', 0.1);
  TESTS.assert(out.jitterAmt === 0);
});

TESTS.test('M1 Intensity at v=0.4 (between gates) jitter on, stutter off', () => {
  const out = MACROS.compute('m1', 0.4);
  TESTS.assert(out.jitterAmt === 0.4);
  TESTS.assert(out.stutterProb === 0);
});

TESTS.test('M2 Decay at v=1: heavy filter, full reverb, drop dist, drop vol', () => {
  const out = MACROS.compute('m2', 1);
  TESTS.assert(TESTS.approx(out.visualJag, 0.3));
  TESTS.assert(out.lpfFreq === 1);
  TESTS.assert(out.reverbWet === 1);
  TESTS.assert(out.distortion === 0);
  TESTS.assert(TESTS.approx(out.masterVol, 0.6));
});

TESTS.test('M3 Aggression at v=1: full chaos', () => {
  const out = MACROS.compute('m3', 1);
  TESTS.assert(out.distortion === 1);
  TESTS.assert(out.jitterAmt === 1);
  TESTS.assert(out.stutterProb === 1);
  TESTS.assert(out.reverseProb === 1);
  TESTS.assert(TESTS.approx(out.lpfFreq, 0.6));
});

TESTS.test('M4 Hush at v=1: silent, calm, open', () => {
  const out = MACROS.compute('m4', 1);
  TESTS.assert(out.masterVol === 0);
  TESTS.assert(out.visualJag === 0);
  TESTS.assert(out.lpfFreq === 0);
  TESTS.assert(out.jitterAmt === 0);
  TESTS.assert(out.stutterProb === 0);
  TESTS.assert(out.reverbWet === 0);
  TESTS.assert(out.distortion === 0);
});

TESTS.test('M4 Hush at v=0: leaves things at full', () => {
  const out = MACROS.compute('m4', 0);
  TESTS.assert(out.masterVol === 1);
  TESTS.assert(out.lpfFreq === 1);
});

TESTS.test('MACROS.apply writes through PARAMS.setParam', () => {
  PARAMS.setParam('jitterAmt', 0);
  MACROS.apply('m3', 0.7);
  TESTS.assert(PARAMS.byName('jitterAmt').manual === 0.7);
});
