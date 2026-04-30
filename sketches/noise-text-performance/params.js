// params.js
const PARAMS = (() => {
  const params = {};
  function byName(name) { return params[name]; }
  function byCC(cc) { return Object.values(params).find(p => p.cc === cc); }
  return {
    params,
    all: () => Object.values(params),
    byName,
    byCC,
  };
})();
