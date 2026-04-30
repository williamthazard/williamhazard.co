// engine.js
const ENGINE = (() => {
  let active = false;
  return {
    activate: () => { active = true; },
    deactivate: () => { active = false; },
    isActive: () => active,
    tick: () => ({ normInt: 0, sine: 0, perlin: 0 }),
  };
})();
