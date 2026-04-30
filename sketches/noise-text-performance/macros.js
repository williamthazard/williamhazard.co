// macros.js
const MACROS = (() => {
  const macros = {};
  return {
    macros,
    all: () => Object.values(macros),
    byName: (name) => macros[name],
  };
})();
