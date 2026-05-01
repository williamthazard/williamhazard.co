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

  function showPicker(devices, onConfirm) {
    if (pickerEl) return;
    pickerEl = document.createElement('div');
    Object.assign(pickerEl.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(10, 10, 18, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '10000', color: '#e0e0f0', fontFamily: 'monospace',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      background: '#1a1a26', padding: '32px', borderRadius: '8px',
      minWidth: '400px', border: '1px solid rgba(255,255,255,0.1)',
    });

    const title = document.createElement('p');
    title.textContent = 'No Midi Fighter Twister detected.';
    title.style.marginBottom = '16px';
    card.appendChild(title);

    function buildSelect(label, options) {
      const lbl = document.createElement('label');
      lbl.textContent = label;
      Object.assign(lbl.style, { display: 'block', marginBottom: '8px' });
      const sel = document.createElement('select');
      Object.assign(sel.style, {
        width: '100%', padding: '6px', marginBottom: '16px',
        background: '#0a0a12', color: '#e0e0f0', border: '1px solid #333',
        fontFamily: 'inherit',
      });
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = '— none —';
      sel.appendChild(noneOpt);
      for (const d of options) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        sel.appendChild(opt);
      }
      card.appendChild(lbl);
      card.appendChild(sel);
      return sel;
    }

    const inSel = buildSelect('MIDI input:', devices.inputs);
    const outSel = buildSelect('MIDI output:', devices.outputs);

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '8px';
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Continue';
    Object.assign(confirmBtn.style, {
      padding: '8px 16px', marginRight: '8px',
      background: '#444', color: '#fff', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit',
    });
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    Object.assign(skipBtn.style, {
      padding: '8px 16px', background: 'transparent',
      color: '#aaa', border: '1px solid #333', cursor: 'pointer',
      fontFamily: 'inherit',
    });
    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(skipBtn);
    card.appendChild(btnRow);

    confirmBtn.addEventListener('click', () => {
      const inputId = inSel.value || null;
      const outputId = outSel.value || null;
      hidePicker();
      onConfirm({ inputId, outputId });
    });
    skipBtn.addEventListener('click', () => {
      hidePicker();
      onConfirm({ inputId: null, outputId: null });
    });

    pickerEl.appendChild(card);
    document.body.appendChild(pickerEl);
  }

  function hidePicker() {
    if (pickerEl) { pickerEl.remove(); pickerEl = null; }
  }
  function toggleDebug() {
    if (debugVisible) { hideDebug(); } else { showDebug(); }
  }

  function showDebug() {
    if (debugEl) return;
    debugEl = document.createElement('div');
    Object.assign(debugEl.style, {
      position: 'fixed', left: '12px', bottom: '12px',
      background: 'rgba(10,10,18,0.85)', color: '#cfd0e0',
      padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px',
      lineHeight: '1.4', borderRadius: '6px',
      minWidth: '420px', maxWidth: '520px',
      maxHeight: '70vh', overflow: 'auto', zIndex: '9999',
      backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.06)',
      whiteSpace: 'pre',
    });
    document.body.appendChild(debugEl);
    debugVisible = true;
    refreshDebugLoop();
  }

  function hideDebug() {
    if (debugRefreshId) {
      clearTimeout(debugRefreshId);
      debugRefreshId = null;
    }
    if (debugEl) { debugEl.remove(); debugEl = null; }
    debugVisible = false;
  }

  function refreshDebugLoop() {
    if (!debugVisible) return;
    renderDebug();
    debugRefreshId = setTimeout(refreshDebugLoop, 100);
  }

  function renderDebug() {
    if (!debugEl) return;
    while (debugEl.firstChild) debugEl.removeChild(debugEl.firstChild);

    function addLine(text, isHeader) {
      const line = document.createElement('div');
      line.textContent = text;
      if (isHeader) line.style.fontWeight = 'bold';
      debugEl.appendChild(line);
    }
    function addBlank() {
      const line = document.createElement('div');
      line.textContent = '';
      debugEl.appendChild(line);
    }

    addLine(`MIDI: ${MIDI.isBound() ? '✓ bound' : '✗ not bound'}`, true);
    addBlank();

    addLine('PARAMS', true);
    for (const p of PARAMS.all()) {
      const m = p.manual.toFixed(3);
      const v = p.value.toFixed(3);
      const out = PARAMS.mappedValue(p).toFixed(3);
      addLine(`  ${p.label.padEnd(28, ' ')} m=${m}  v=${v}  out=${out}`);
    }
    addBlank();

    addLine('RECENT MIDI', true);
    const msgs = MIDI.getRecentMessages ? MIDI.getRecentMessages() : [];
    for (const m of msgs.slice(-10).reverse()) {
      addLine(`  ch${m.channel} cc${m.cc} v${m.value}  → ${m.target || ''}`);
    }
    addBlank();

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = '[ Reopen device picker ]';
    link.style.color = '#8af';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
        await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
      });
    });
    debugEl.appendChild(link);
  }

  function showDisconnect() {}
  function hideDisconnect() {}

  return {
    showBegin, hideBegin,
    showPicker, hidePicker,
    toggleDebug,
    showDisconnect, hideDisconnect,
  };
})();
