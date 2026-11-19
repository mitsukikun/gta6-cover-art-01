// Neon Sunset Cover Maker — the cover renderer.
//
// drawCover paints one GTA-poster-style cover onto any 2D canvas context:
// several photo panels in a poster layout, a sunset or neon colour grade,
// palm silhouettes, and bold condensed caption lettering. It is pure canvas
// drawing: no network, no uploads, every photo already an <img> in memory.

export const LAYOUTS = {
  hero: { label: 'Hero + strip', panels: 3 },
  grid: { label: 'Four panel grid', panels: 4 },
  triptych: { label: 'Triptych', panels: 3 },
  split: { label: 'Diagonal split', panels: 2 },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset' },
  neon: { label: 'Neon Nights' },
  dusk: { label: 'Palm Dusk' },
  noir: { label: 'Noir' },
};

export const TITLE_STYLES = {
  sunset: { label: 'Sunset gradient' },
  white: { label: 'White' },
  neon: { label: 'Neon pink' },
  gold: { label: 'Gold' },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

/** A fresh default state: two sample photos, hero layout, sunset grade. */
export function defaultState() {
  return {
    layout: 'hero',
    size: '1080x1080',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'NEON SUNSET • 2026',
    titleStyle: 'sunset',
    frame: true,
    photos: [null, null, null],
    panels: [
      { photo: 0, zoom: 1.12, ox: 0.5, oy: 0.42 },
      { photo: 1, zoom: 1.2, ox: 0.5, oy: 0.5 },
      { photo: 0, zoom: 1.35, ox: 0.3, oy: 0.35 },
      { photo: 1, zoom: 1.15, ox: 0.65, oy: 0.35 },
    ],
  };
}

/** Panel rectangles for a layout, in fractions of the cover, with gutters. */
export function layoutPanels(layout, W, H) {
  const g = Math.max(4, Math.round(W * 0.012));
  const full = { x: 0, y: 0, w: W, h: H };
  if (layout === 'grid') {
    const cw = (W - g) / 2;
    const ch = (H - g) / 2;
    return [
      { x: 0, y: 0, w: cw, h: ch },
      { x: cw + g, y: 0, w: cw, h: ch },
      { x: 0, y: ch + g, w: cw, h: ch },
      { x: cw + g, y: ch + g, w: cw, h: ch },
    ];
  }
  if (layout === 'triptych') {
    const cw = (W - 2 * g) / 3;
    return [
      { x: 0, y: 0, w: cw, h: H },
      { x: cw + g, y: 0, w: cw, h: H },
      { x: 2 * (cw + g), y: 0, w: cw, h: H },
    ];
  }
  if (layout === 'split') {
    return [
      { x: 0, y: 0, w: W * 0.58, h: H },
      { x: W * 0.58, y: 0, w: W * 0.42, h: H },
    ];
  }
  // hero: one big panel on top, two small ones in a strip below.
  const heroH = Math.round(H * 0.64);
  const stripH = H - heroH - g;
  const stripW = (W - g) / 2;
  return [
    { x: 0, y: 0, w: W, h: heroH },
    { x: 0, y: heroH + g, w: stripW, h: stripH },
    { x: stripW + g, y: heroH + g, w: stripW, h: stripH },
  ];
}

/** Where the caption band sits for a layout: {x, y, w, h, align}. */
export function titleBand(layout, W, H) {
  if (layout === 'hero') {
    return { x: W * 0.045, y: H * 0.40, w: W * 0.91, h: H * 0.22, align: 'left' };
  }
  if (layout === 'split') {
    return { x: W * 0.045, y: H * 0.05, w: W * 0.52, h: H * 0.2, align: 'left' };
  }
  return { x: W * 0.045, y: H * 0.76, w: W * 0.91, h: H * 0.2, align: 'left' };
}

/** Draws one photo cover-filling a rectangle, honouring zoom and focal point. */
export function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  if (!img || !img.naturalWidth) return;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - pw) * clamp(ox, 0, 1);
  const dy = rect.y + (rect.h - ph) * clamp(oy, 0, 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** A palm silhouette: curved trunk plus seven drooping fronds. */
export function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -60, 4, -118);
  ctx.stroke();
  ctx.translate(4, -118);
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.08) - (i * Math.PI) / 7.4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * 52, Math.sin(a) * 52 - 26, Math.cos(a) * 96, Math.sin(a) * 96 + 26);
    ctx.quadraticCurveTo(Math.cos(a) * 52, Math.sin(a) * 52 + 8, 0, 0);
    ctx.fill();
  }
  ctx.restore();
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function gradeOverlay(ctx, grade, W, H, layout, panels) {
  const gutter = panels.length > 1 ? Math.max(4, Math.round(W * 0.012)) : 0;
  if (grade === 'noir') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,10,24,0.10)');
    g.addColorStop(1, 'rgba(10,10,24,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,0,160,0.30)');
    g.addColorStop(0.55, 'rgba(120,0,255,0.16)');
    g.addColorStop(1, 'rgba(0,220,255,0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Neon accent lines sit exactly on the layout's gutters, never on faces.
    const lw = Math.max(2, H * 0.004);
    if (layout === 'hero' || layout === 'grid') {
      const y = panels[0].y + panels[0].h + gutter / 2;
      ctx.fillStyle = 'rgba(0,240,255,0.9)';
      ctx.fillRect(0, y - lw, W, lw);
      ctx.fillStyle = 'rgba(255,0,170,0.9)';
      ctx.fillRect(0, y + lw, W, Math.max(2, lw * 0.7));
    } else {
      const x = panels[0].x + panels[0].w + gutter / 2;
      ctx.fillStyle = 'rgba(0,240,255,0.9)';
      ctx.fillRect(x - lw, 0, lw, H);
      ctx.fillStyle = 'rgba(255,0,170,0.9)';
      ctx.fillRect(x + lw, 0, Math.max(2, lw * 0.7), H);
    }
    return;
  }
  if (grade === 'dusk') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(8,64,84,0.38)');
    g.addColorStop(0.6, 'rgba(20,40,70,0.12)');
    g.addColorStop(1, 'rgba(255,170,60,0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // sunset: warm wash plus a glowing sun disc in the hero panel.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,140,60,0.10)');
  g.addColorStop(0.55, 'rgba(255,80,60,0.14)');
  g.addColorStop(1, 'rgba(190,20,120,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const heroRect = panels[0];
  const cx = heroRect.x + heroRect.w * 0.76;
  const cy = heroRect.y + heroRect.h * 0.34;
  const r = Math.min(W, H) * 0.17;
  const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  sun.addColorStop(0, 'rgba(255,236,160,0.95)');
  sun.addColorStop(0.45, 'rgba(255,170,80,0.75)');
  sun.addColorStop(1, 'rgba(255,110,60,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/** Bold condensed caption lettering with outline, shadow and gradient fill. */
export function drawTitle(ctx, text, sub, band, W, H, style) {
  const caption = (text || '').trim().toUpperCase();
  if (!caption) return;
  const maxW = band.w;
  let size = band.h * 0.62;
  const font = (px) => `${px}px "Archivo Black", "Arial Black", "Noto Sans", sans-serif`;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Condense the lettering slightly, poster style.
  ctx.translate(band.x, band.y);
  ctx.scale(0.92, 1);
  const fitW = maxW / 0.92;
  ctx.font = font(size);
  while (ctx.measureText(caption).width > fitW && size > 14) {
    size -= 2;
    ctx.font = font(size);
  }
  const baseline = band.h * 0.62;
  const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.12);
  if (style === 'white') {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#e8e2f2');
  } else if (style === 'neon') {
    grad.addColorStop(0, '#ffe9fb');
    grad.addColorStop(0.55, '#ff4fd8');
    grad.addColorStop(1, '#b400ff');
  } else if (style === 'gold') {
    grad.addColorStop(0, '#fff6c8');
    grad.addColorStop(0.55, '#ffc93c');
    grad.addColorStop(1, '#ff7a1a');
  } else {
    grad.addColorStop(0, '#fffbe8');
    grad.addColorStop(0.5, '#ffd166');
    grad.addColorStop(1, '#ff4e8a');
  }
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeStyle = '#160a24';
  ctx.shadowColor = style === 'neon' ? 'rgba(255,0,200,0.85)' : 'rgba(20,4,40,0.9)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(caption, 0, baseline);
  ctx.fillStyle = grad;
  ctx.fillText(caption, 0, baseline);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Subtitle: letterspaced capitals under the title.
  const subText = (sub || '').trim().toUpperCase();
  if (subText) {
    const subSize = Math.max(11, size * 0.2);
    ctx.font = `700 ${subSize}px "Noto Sans", "Arial", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    const spaced = subText.split('').join('  ');
    ctx.fillText(spaced, size * 0.03, baseline + subSize * 1.9);
    ctx.globalAlpha = 1;
    // Three sparkles after the subtitle.
    const sx = ctx.measureText(spaced).width + size * 0.16;
    const sy = baseline + subSize * 1.55;
    drawSparkle(ctx, sx, sy, subSize * 0.5, '#ffd166');
    drawSparkle(ctx, sx + subSize * 1.1, sy, subSize * 0.34, '#ff4fd8');
  }
  ctx.restore();
}

function drawSparkle(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.22, -r * 0.22, r, 0);
  ctx.quadraticCurveTo(r * 0.22, r * 0.22, 0, r);
  ctx.quadraticCurveTo(-r * 0.22, r * 0.22, -r, 0);
  ctx.quadraticCurveTo(-r * 0.22, -r * 0.22, 0, -r);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws the whole cover onto `ctx` at W x H, from `state`:
 * photos, layout, grade, title and frame. The canvas is cleared first.
 */
export function drawCover(ctx, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#150a20';
  ctx.fillRect(0, 0, W, H);
  const panels = layoutPanels(state.layout, W, H);
  const count = LAYOUTS[state.layout].panels;
  // Photos, with the noir grade desaturating them as they are drawn.
  if (state.grade === 'noir') ctx.filter = 'grayscale(0.7) contrast(1.12) brightness(1.04)';
  for (let i = 0; i < count; i++) {
    const p = state.panels[i];
    const img = p && p.photo != null ? state.photos[p.photo] : null;
    if (img) drawPhotoInto(ctx, img, panels[i], p.zoom || 1, p.ox ?? 0.5, p.oy ?? 0.5);
    else {
      // Empty panel: a dusk gradient placeholder with a hint.
      const g = ctx.createLinearGradient(panels[i].x, panels[i].y, panels[i].x, panels[i].y + panels[i].h);
      g.addColorStop(0, '#3a1c5c');
      g.addColorStop(1, '#12081e');
      ctx.fillStyle = g;
      ctx.fillRect(panels[i].x, panels[i].y, panels[i].w, panels[i].h);
    }
  }
  ctx.filter = 'none';
  // White poster seams between panels.
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, W * 0.004);
  for (let i = 0; i < count; i++) ctx.strokeRect(panels[i].x, panels[i].y, panels[i].w, panels[i].h);
  gradeOverlay(ctx, state.grade, W, H, state.layout, panels);
  // Palm silhouettes along the bottom for the sunset and dusk grades.
  if (state.grade === 'sunset' || state.grade === 'dusk') {
    const s = Math.min(W, H) / 1080;
    drawPalm(ctx, W * 0.045, H * 0.995, 0.62 * s, 'rgba(16,5,28,0.9)');
    drawPalm(ctx, W * 0.15, H * 0.995, 0.45 * s, 'rgba(16,5,28,0.75)');
    drawPalm(ctx, W * 0.955, H * 0.995, 0.55 * s, 'rgba(16,5,28,0.9)');
  }
  // Soft vignette so the lettering pops.
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,18,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // Caption band: dark fade behind the lettering, then the title itself.
  const band = titleBand(state.layout, W, H);
  const fade = ctx.createLinearGradient(0, band.y - band.h * 0.35, 0, band.y + band.h);
  fade.addColorStop(0, 'rgba(12,4,24,0)');
  fade.addColorStop(1, 'rgba(12,4,24,0.82)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, band.y - band.h * 0.35, W, band.h * 1.35);
  drawTitle(ctx, state.title, state.subtitle, band, W, H, state.titleStyle);
  // Thin white frame, poster style.
  if (state.frame) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(3, W * 0.006);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
}

/** Renders a fresh canvas at W x H from `state` and returns it. */
export function renderCover(state, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  drawCover(canvas.getContext('2d'), state, W, H);
  return canvas;
}
