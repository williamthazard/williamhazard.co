const UI = (() => {
  let beginEl = null;
  let pickerEl = null;
  let debugEl = null;
  let disconnectEl = null;
  let debugVisible = false;
  let debugRefreshId = null;

  function showBegin(onClick) {
    if (beginEl) return;
    beginEl = document.createElement('div');
    beginEl.id = 'begin-overlay';
    Object.assign(beginEl.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(10, 10, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10000', cursor: 'pointer',
      color: '#e0e0f0', fontFamily: 'monospace', fontSize: '24px',
      letterSpacing: '0.2em', userSelect: 'none',
    });
    beginEl.textContent = 'CLICK TO BEGIN';
    beginEl.addEventListener('click', async () => {
      beginEl.textContent = 'STARTING…';
      await onClick();
      hideBegin();
    });
    document.body.appendChild(beginEl);
  }

  function hideBegin() {
    if (beginEl) { beginEl.remove(); beginEl = null; }
  }

  // Stubs for later tasks.
  function showPicker() {}
  function hidePicker() {}
  function toggleDebug() {}
  function showDisconnect() {}
  function hideDisconnect() {}

  return {
    showBegin, hideBegin,
    showPicker, hidePicker,
    toggleDebug,
    showDisconnect, hideDisconnect,
  };
})();
