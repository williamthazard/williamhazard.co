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
      // Anchored across the bottom, horizontally centered. Banks lay out side
      // by side inside, so analogous controls in different banks line up
      // vertically (same column on screen).
      position: 'fixed', left: '50%', bottom: '12px',
      transform: 'translateX(-50%)',
      background: 'rgba(10,10,18,0.85)', color: '#cfd0e0',
      padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px',
      lineHeight: '1.4', borderRadius: '6px',
      maxWidth: 'calc(100vw - 24px)',
      // Only constrain to viewport. On any decently-sized window the content
      // fits naturally and no scrollbar appears; tiny windows still scroll.
      maxHeight: 'calc(100vh - 24px)',
      overflow: 'auto', zIndex: '9999',
      backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.06)',
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

  // ---------- Knob visualization helpers ----------

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Short labels for knobs (display under the visual). MFT uses tight cells.
  const SHORT_LABELS = {
    micVol: 'Mic',           masterVol: 'Vol',         bpm: 'BPM',         modAmount: 'Mod',
    preLpf: 'PreLPF',        preDist: 'PreDist',       reverbWet: 'RvbWet', reverbDecay: 'RvbDec',
    density: 'Density',      grainDurScale: 'Grain',   cutoffBase: 'Cut',  resonance: 'Res',
    panRange: 'Pan',         ampRange: 'Amp',          lfoSpeed: 'LFO',    lfoVariance: 'Var',
    fbkLevel: 'Fbk',         preserve: 'Preserve',     fbkHpf: 'FbkHPF',   fbkBalance: 'FbkBal',
    fbkNoise: 'FbkNoi',      fbkSine: 'FbkSin',        fbkSineHz: 'FbkSnHz', softClipDrive: 'Clip',
  };

  // Per-param formatters. Default falls back to magnitude-based formatting.
  const FORMATTERS = {
    micVol:        (m) => (m * 100).toFixed(0) + '%',
    masterVol:     (m) => (m * 100).toFixed(0) + '%',
    bpm:           (m) => m.toFixed(0) + ' bpm',
    modAmount:     (m) => (m * 100).toFixed(0) + '%',
    preLpf:        (m) => m >= 1000 ? (m / 1000).toFixed(1) + 'k' : m.toFixed(0) + 'Hz',
    preDist:       (m) => m.toFixed(2),
    reverbWet:     (m) => m.toFixed(2),
    reverbDecay:   (m) => m.toFixed(1) + 's',
    density:       (m) => m.toFixed(2) + '×',
    grainDurScale: (m) => m.toFixed(2) + '×',
    cutoffBase:    (m) => m >= 1000 ? (m / 1000).toFixed(1) + 'k' : m.toFixed(0) + 'Hz',
    resonance:     (m) => m.toFixed(2),
    panRange:      (m) => m.toFixed(2),
    ampRange:      (m) => m.toFixed(2),
    lfoSpeed:      (m) => m.toFixed(2) + '×',
    lfoVariance:   (m) => m.toFixed(2),
    fbkLevel:      (m) => m.toFixed(2),
    preserve:      (m) => m.toFixed(2),
    fbkHpf:        (m) => m.toFixed(0) + 'Hz',
    fbkBalance:    (m) => (m >= 0 ? '+' : '') + m.toFixed(2),
    fbkNoise:      (m) => m.toFixed(2),
    fbkSine:       (m) => m.toFixed(2),
    fbkSineHz:     (m) => m.toFixed(0) + 'Hz',
    softClipDrive: (m) => m.toFixed(2),
  };

  function paramShortLabel(name, fallback) {
    return SHORT_LABELS[name] || (fallback || name).slice(0, 8);
  }

  function paramName(p) {
    // PARAMS doesn't store name on the entry; reverse-lookup via PARAMS.params.
    for (const [k, v] of Object.entries(PARAMS.params)) {
      if (v === p) return k;
    }
    return '';
  }

  function angleToPoint(angleDeg, cx, cy, r) {
    // 0° = top (12 o'clock), positive = clockwise
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, r, startAngle, endAngle) {
    const start = angleToPoint(startAngle, cx, cy, r);
    const end = angleToPoint(endAngle, cx, cy, r);
    const sweepAngle = endAngle - startAngle;
    const largeArc = Math.abs(sweepAngle) > 180 ? 1 : 0;
    const sweep = sweepAngle > 0 ? 1 : 0;
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function buildKnobSvg(value, opts = {}) {
    const { isBipolar = false, ringColor = null, dim = false, arcColor = '#8af' } = opts;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 50 50');
    svg.setAttribute('width', '50');
    svg.setAttribute('height', '50');

    const cx = 25, cy = 25, r = 18;

    // Outer faint ring (or switch state ring if active)
    const bg = document.createElementNS(SVG_NS, 'circle');
    bg.setAttribute('cx', cx);
    bg.setAttribute('cy', cy);
    bg.setAttribute('r', r);
    bg.setAttribute('fill', 'none');
    bg.setAttribute('stroke', ringColor || (dim ? '#1f1f2a' : '#2a2a3a'));
    bg.setAttribute('stroke-width', ringColor ? '2' : '1');
    svg.appendChild(bg);

    if (dim) return svg; // empty slot — just the faint ring

    // Position arc
    let startAngle, endAngle;
    if (isBipolar) {
      // Center at 12 o'clock; v=0.5 is no arc.
      if (value >= 0.5) {
        startAngle = 0;
        endAngle = (value - 0.5) * 2 * 135; // 0..135°
      } else {
        startAngle = -(0.5 - value) * 2 * 135; // -135..0°
        endAngle = 0;
      }
    } else {
      startAngle = -135;
      endAngle = -135 + value * 270;
    }

    if (Math.abs(endAngle - startAngle) > 0.5) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', arcPath(cx, cy, r, startAngle, endAngle));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', arcColor);
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('stroke-linecap', 'round');
      svg.appendChild(path);
    }

    // Position dot at end of arc (also marks current position when arc is invisible)
    const dotPos = angleToPoint(endAngle, cx, cy, r);
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', dotPos.x);
    dot.setAttribute('cy', dotPos.y);
    dot.setAttribute('r', '2');
    dot.setAttribute('fill', '#e0e0f0');
    svg.appendChild(dot);

    // Center detent for bipolar
    if (isBipolar) {
      const centerPos = angleToPoint(0, cx, cy, r);
      const detent = document.createElementNS(SVG_NS, 'circle');
      detent.setAttribute('cx', centerPos.x);
      detent.setAttribute('cy', centerPos.y);
      detent.setAttribute('r', '1');
      detent.setAttribute('fill', '#555');
      svg.appendChild(detent);
    }

    return svg;
  }

  function buildKnobCell(cc) {
    const cell = document.createElement('div');
    Object.assign(cell.style, {
      width: '58px', textAlign: 'center', display: 'flex',
      flexDirection: 'column', alignItems: 'center', gap: '2px',
    });

    const param = PARAMS.byCC(cc);
    const macro = (typeof MACROS !== 'undefined') ? MACROS.byCC(cc) : null;

    if (!param && !macro) {
      // Empty slot
      cell.appendChild(buildKnobSvg(0, { dim: true }));
      const blank = document.createElement('div');
      blank.style.height = '24px';
      cell.appendChild(blank);
      return cell;
    }

    let labelText, valueText, position, isBipolar = false, ringColor = null, arcColor = '#8af';

    if (param) {
      const name = paramName(param);
      labelText = paramShortLabel(name, param.label);
      const fmt = FORMATTERS[name];
      const mapped = PARAMS.mappedValue(param);
      valueText = fmt ? fmt(mapped) : mapped.toFixed(2);
      position = param.manual;
      isBipolar = param.curve === 'bipolar';

      if (typeof SWITCHES !== 'undefined') {
        if (cc === 0 && SWITCHES.state.micMuted) ringColor = '#e54141';
        if (cc === 1 && SWITCHES.state.outMuted) ringColor = '#e54141';
      }
    } else {
      // macro
      labelText = macro.label;
      const v = macro.value || 0;
      valueText = (v * 100).toFixed(0) + '%';
      position = v;
      arcColor = '#d4a8ff'; // distinguish macros from params
    }

    cell.appendChild(buildKnobSvg(position, { isBipolar, ringColor, arcColor }));

    const labelEl = document.createElement('div');
    labelEl.textContent = labelText;
    Object.assign(labelEl.style, { fontSize: '10px', color: '#cfd0e0', lineHeight: '1.1' });
    cell.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.textContent = valueText;
    Object.assign(valueEl.style, { fontSize: '9px', color: '#888', lineHeight: '1.1' });
    cell.appendChild(valueEl);

    return cell;
  }

  function buildBankGrid(title, ccStart) {
    const wrap = document.createElement('div');

    const heading = document.createElement('div');
    heading.textContent = title;
    Object.assign(heading.style, {
      fontSize: '10px', fontWeight: 'bold', color: '#888',
      marginBottom: '6px', letterSpacing: '0.08em',
    });
    wrap.appendChild(heading);

    const grid = document.createElement('div');
    Object.assign(grid.style, {
      display: 'grid', gridTemplateColumns: 'repeat(4, 58px)',
      gap: '6px 4px',
    });
    for (let i = 0; i < 16; i++) {
      grid.appendChild(buildKnobCell(ccStart + i));
    }
    wrap.appendChild(grid);
    return wrap;
  }

  // ---------- renderDebug ----------

  function renderDebug() {
    if (!debugEl) return;
    while (debugEl.firstChild) debugEl.removeChild(debugEl.firstChild);

    // MIDI status header
    const header = document.createElement('div');
    header.textContent = `MIDI: ${MIDI.isBound() ? '✓ bound' : '✗ not bound'}`;
    Object.assign(header.style, { fontWeight: 'bold', marginBottom: '10px' });
    debugEl.appendChild(header);

    // Main row: three banks on the left, MIDI log on the right.
    // Putting the log alongside (not below) keeps the overlay short — the
    // banks are the tallest thing, and the log fills the space next to them.
    const mainRow = document.createElement('div');
    Object.assign(mainRow.style, { display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' });

    const banksRow = document.createElement('div');
    Object.assign(banksRow.style, { display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'flex-start' });
    banksRow.appendChild(buildBankGrid('BANK 1 — PERFORMANCE', 0));
    banksRow.appendChild(buildBankGrid('BANK 2 — FEEDBACK', 16));
    mainRow.appendChild(banksRow);

    // Recent MIDI column (heading + log + reopen-picker link).
    const logColumn = document.createElement('div');
    Object.assign(logColumn.style, { display: 'flex', flexDirection: 'column', minWidth: '220px', maxWidth: '300px' });

    const logHeader = document.createElement('div');
    logHeader.textContent = 'RECENT MIDI';
    Object.assign(logHeader.style, {
      fontSize: '10px', fontWeight: 'bold', color: '#888',
      letterSpacing: '0.08em', marginBottom: '6px',
    });
    logColumn.appendChild(logHeader);

    const logBox = document.createElement('div');
    Object.assign(logBox.style, { fontSize: '10px', color: '#9a9aa8', whiteSpace: 'pre', flexGrow: '1' });
    const msgs = MIDI.getRecentMessages ? MIDI.getRecentMessages() : [];
    if (msgs.length === 0) {
      logBox.textContent = '  (no messages yet)';
    } else {
      const lines = msgs.slice(-10).reverse().map(m =>
        `ch${m.channel} cc${String(m.cc).padStart(2, ' ')} v${String(m.value).padStart(3, ' ')}  → ${m.target || ''}`
      );
      logBox.textContent = lines.join('\n');
    }
    logColumn.appendChild(logBox);

    const link = document.createElement('a');
    link.href = '#';
    link.textContent = '[ Reopen device picker ]';
    Object.assign(link.style, {
      color: '#8af', display: 'inline-block', marginTop: '10px', fontSize: '10px',
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPicker(MIDI.listDevices(), async ({ inputId, outputId }) => {
        await MIDI.connect({ preferInputId: inputId, preferOutputId: outputId });
      });
    });
    logColumn.appendChild(link);

    mainRow.appendChild(logColumn);
    debugEl.appendChild(mainRow);
  }

  function showDisconnect() {
    if (disconnectEl) return;
    disconnectEl = document.createElement('div');
    Object.assign(disconnectEl.style, {
      position: 'fixed', right: '14px', bottom: '14px',
      width: '8px', height: '8px', borderRadius: '50%',
      background: '#e54141', boxShadow: '0 0 6px rgba(229,65,65,0.6)',
      zIndex: '9998',
    });
    document.body.appendChild(disconnectEl);
  }

  function hideDisconnect() {
    if (disconnectEl) { disconnectEl.remove(); disconnectEl = null; }
  }

  // Returns true if the (viewport-relative) point is inside the visible debug
  // overlay. Used by sketch.js mouseWheel to avoid hijacking scrolls that
  // should belong to the overlay's own internal scrollbar.
  function isMouseOverDebug(clientX, clientY) {
    if (!debugEl) return false;
    const rect = debugEl.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right &&
           clientY >= rect.top  && clientY <= rect.bottom;
  }

  return {
    showBegin, hideBegin,
    showPicker, hidePicker,
    toggleDebug,
    showDisconnect, hideDisconnect,
    isMouseOverDebug,
  };
})();
