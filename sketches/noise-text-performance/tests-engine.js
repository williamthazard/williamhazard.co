TESTS.test('ENGINE starts inactive', () => {
  TESTS.assert(ENGINE.isActive() === false);
});

TESTS.test('ENGINE activate() makes it active', () => {
  ENGINE.activate();
  TESTS.assert(ENGINE.isActive() === true);
  ENGINE.deactivate();
});

TESTS.test('ENGINE deactivate() returns it to inactive and zeros lastTick', () => {
  ENGINE.activate();
  ENGINE.deactivate();
  TESTS.assert(ENGINE.isActive() === false);
  const t = ENGINE.tick();
  TESTS.assert(t.normInt === 0);
});

TESTS.test('ENGINE tick() inactive returns the lastTick (zero on init)', () => {
  ENGINE.deactivate();
  const t = ENGINE.tick();
  TESTS.assert(t.normInt === 0);
});

TESTS.test('ENGINE first tick after activate produces normInt ≈ 0 (sine starts at -1)', () => {
  ENGINE.activate();
  const t = ENGINE.tick();
  TESTS.assert(TESTS.approx(t.normInt, 0, 0.01), `expected ~0, got ${t.normInt}`);
  ENGINE.deactivate();
});
