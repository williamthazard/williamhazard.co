let seed;
let noiseSlider, weightSlider, passesSlider, detailSlider;

function setup() {
  createCanvas(800, 800);
  pixelDensity(2);
  seed = random(100000);

  noiseSlider = createSlider(0, 40, 10, 0.5);
  weightSlider = createSlider(1, 10, 3.5, 0.5);
  passesSlider = createSlider(1, 5, 2, 1);
  detailSlider = createSlider(0.2, 3, 1.0, 0.1);

  noiseSlider.input(redraw);
  weightSlider.input(redraw);
  passesSlider.input(redraw);
  detailSlider.input(redraw);

  createButton('Regenerate').mousePressed(() => { seed = random(100000); redraw(); });
  createButton('Download PNG').mousePressed(() => saveCanvas('circle-a', 'png'));
  createButton('Download SVG').mousePressed(downloadSVG);

  noLoop();
}

function getParams() {
  return {
    noiseAmt: noiseSlider.value(),
    strokeW: weightSlider.value(),
    passes: passesSlider.value(),
    noiseScale: detailSlider.value() * 0.008,
  };
}

function draw() {
  background(244, 243, 241);
  const p = getParams();

  noiseSeed(floor(seed));
  randomSeed(floor(seed));

  const cx = width / 2;
  const cy = height / 2;
  const r = 280;

  stroke(56, 54, 58);
  noFill();

  const circlePts = circlePoints(cx, cy, r, 400);

  const topY = cy - r * 1.08;
  const botY = cy + r * 0.92;
  const spread = r * 0.62;

  const leftLeg = linePts(cx, topY, cx - spread, botY, 100);
  const rightLeg = linePts(cx, topY, cx + spread, botY, 100);

  const crossY = cy + r * 0.1;
  const t = (crossY - topY) / (botY - topY);
  const cxl = cx - spread * t - r * 0.18;
  const cxr = cx + spread * t + r * 0.18;
  const crossbar = linePts(cxl, crossY, cxr, crossY, 70);

  for (let pass = 0; pass < p.passes; pass++) {
    const passOffset = pass * 73.7;
    const wJitter = p.passes > 1 ? random(0.85, 1.15) : 1;
    strokeWeight(p.strokeW * wJitter);

    drawHandDrawn(circlePts, true, p.noiseAmt, p.noiseScale, passOffset);
    drawHandDrawn(leftLeg, false, p.noiseAmt, p.noiseScale, passOffset + 1000);
    drawHandDrawn(rightLeg, false, p.noiseAmt, p.noiseScale, passOffset + 2000);
    drawHandDrawn(crossbar, false, p.noiseAmt, p.noiseScale, passOffset + 3000);
  }
}

// --- Geometry helpers ---

function circlePoints(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = map(i, 0, n, 0, TWO_PI);
    pts.push({ x: cx + r * cos(a), y: cy + r * sin(a) });
  }
  return pts;
}

function linePts(x1, y1, x2, y2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push({ x: lerp(x1, x2, t), y: lerp(y1, y2, t) });
  }
  return pts;
}

// --- Hand-drawn rendering ---

function drawHandDrawn(pts, closed, amt, scale, seedOffset) {
  if (pts.length < 2) return;

  beginShape();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];

    let tx, ty;
    if (i === 0) {
      tx = pts[1].x - p.x;
      ty = pts[1].y - p.y;
    } else if (i === pts.length - 1) {
      tx = p.x - pts[i - 1].x;
      ty = p.y - pts[i - 1].y;
    } else {
      tx = pts[i + 1].x - pts[i - 1].x;
      ty = pts[i + 1].y - pts[i - 1].y;
    }

    const len = sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;

    const n1 = noise(i * scale * 3 + seedOffset, seed * 0.1) * 2 - 1;
    const n2 = noise(i * scale * 3 + seedOffset + 500, seed * 0.1 + 500) * 2 - 1;

    let taper = 1;
    if (!closed) {
      const edgeDist = min(i, pts.length - 1 - i);
      taper = constrain(edgeDist / 8, 0, 1);
    }

    const dx = (nx * n1 * amt + tx / len * n2 * amt * 0.3) * taper;
    const dy = (ny * n1 * amt + ty / len * n2 * amt * 0.3) * taper;

    curveVertex(p.x + dx, p.y + dy);

    if (i === 0 || i === pts.length - 1) {
      curveVertex(p.x + dx, p.y + dy);
    }
  }
  if (closed) endShape(CLOSE);
  else endShape();
}

// --- Displacement (shared by canvas draw and SVG export) ---

function displace(pts, closed, amt, scale, seedOffset) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    let tx, ty;
    if (i === 0) { tx = pts[1].x - p.x; ty = pts[1].y - p.y; }
    else if (i === pts.length - 1) { tx = p.x - pts[i - 1].x; ty = p.y - pts[i - 1].y; }
    else { tx = pts[i + 1].x - pts[i - 1].x; ty = pts[i + 1].y - pts[i - 1].y; }

    const len = sqrt(tx * tx + ty * ty) || 1;
    const nx = -ty / len, ny = tx / len;

    const n1 = noise(i * scale * 3 + seedOffset, seed * 0.1) * 2 - 1;
    const n2 = noise(i * scale * 3 + seedOffset + 500, seed * 0.1 + 500) * 2 - 1;

    let taper = 1;
    if (!closed) {
      const edgeDist = min(i, pts.length - 1 - i);
      taper = constrain(edgeDist / 8, 0, 1);
    }

    out.push({
      x: p.x + (nx * n1 * amt + tx / len * n2 * amt * 0.3) * taper,
      y: p.y + (ny * n1 * amt + ty / len * n2 * amt * 0.3) * taper,
    });
  }
  return out;
}

// --- SVG export ---

function downloadSVG() {
  const p = getParams();
  noiseSeed(floor(seed));
  randomSeed(floor(seed));

  const w = 800, h = 800;
  const cx = w / 2, cy = h / 2, r = 280;

  const topY = cy - r * 1.08;
  const botY = cy + r * 0.92;
  const spread = r * 0.62;
  const crossY = cy + r * 0.1;
  const t = (crossY - topY) / (botY - topY);
  const cxl = cx - spread * t - r * 0.18;
  const cxr = cx + spread * t + r * 0.18;

  const allPaths = [];

  for (let pass = 0; pass < p.passes; pass++) {
    const passOffset = pass * 73.7;
    const wJitter = p.passes > 1 ? random(0.85, 1.15) : 1;
    const sw = p.strokeW * wJitter;

    allPaths.push({ pts: displace(circlePoints(cx, cy, r, 400), true, p.noiseAmt, p.noiseScale, passOffset), closed: true, sw });
    allPaths.push({ pts: displace(linePts(cx, topY, cx - spread, botY, 100), false, p.noiseAmt, p.noiseScale, passOffset + 1000), closed: false, sw });
    allPaths.push({ pts: displace(linePts(cx, topY, cx + spread, botY, 100), false, p.noiseAmt, p.noiseScale, passOffset + 2000), closed: false, sw });
    allPaths.push({ pts: displace(linePts(cxl, crossY, cxr, crossY, 70), false, p.noiseAmt, p.noiseScale, passOffset + 3000), closed: false, sw });
  }

  let paths = '';
  for (const { pts, closed, sw } of allPaths) {
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
    }
    if (closed) d += ' Z';
    paths += `  <path d="${d}" fill="none" stroke="rgb(56,54,58)" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="rgb(244,243,241)"/>
${paths}</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'circle-a.svg';
  a.click();
  URL.revokeObjectURL(url);
}
