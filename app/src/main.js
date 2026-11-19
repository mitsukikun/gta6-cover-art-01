// Neon Sunset Cover Maker — page wiring.
//
// Owns the editor state, the controls, panel picking (click a panel, drag
// to move its photo, scroll to zoom it) and the PNG export. Photos are read
// with FileReader on this machine and never leave it. A `?shot=` query sets
// up a fixed scene for screenshots instead (see shots.js).
import { drawCover, defaultState, layoutPanels, LAYOUTS, GRADES, TITLE_STYLES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const state = defaultState();
let selectedPanel = 0;
let drag = null;

const SAMPLES = [
  { name: 'Pier at dusk', url: 'samples/pier.jpg' },
  { name: 'Boulevard night', url: 'samples/boulevard.jpg' },
];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load image'));
    img.src = url;
  });
}

/** Reads a local file into an <img> via FileReader: nothing is uploaded. */
function readLocalFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result).then(resolve, reject);
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

function currentSize() {
  return SIZES[state.size];
}

function redraw() {
  const { w, h } = currentSize();
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), state, w, h);
  syncPanelControls();
}

function setStatus(text) {
  $('status').textContent = text;
}

/** Rebuilds the photo tray thumbnails from state.photos. */
function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (img ? '' : ' empty');
    slot.title = img ? `Photo ${i + 1} — click to put it in the selected panel` : `Photo ${i + 1} — empty`;
    if (img) {
      const thumb = document.createElement('canvas');
      thumb.width = 96;
      thumb.height = 72;
      const tctx = thumb.getContext('2d');
      const scale = Math.max(96 / img.naturalWidth, 72 / img.naturalHeight);
      tctx.drawImage(img, (96 - img.naturalWidth * scale) / 2, (72 - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      slot.appendChild(thumb);
    } else {
      slot.textContent = `+ Photo ${i + 1}`;
    }
    slot.addEventListener('click', () => {
      if (!img) return;
      state.panels[selectedPanel].photo = i;
      redraw();
      setStatus(`Panel ${selectedPanel + 1} now shows photo ${i + 1}.`);
    });
    tray.appendChild(slot);
  });
}

function syncPanelControls() {
  const p = state.panels[selectedPanel];
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${LAYOUTS[state.layout].panels}`;
  $('zoom').value = String(Math.round((p.zoom || 1) * 100));
  $('zoomValue').textContent = `${Math.round((p.zoom || 1) * 100)}%`;
  document.querySelectorAll('#layoutRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  });
  document.querySelectorAll('#styleRow button').forEach((b) => {
    b.classList.toggle('active', b.dataset.style === state.titleStyle);
  });
  document.querySelectorAll('#sizeRow input').forEach((r) => {
    r.checked = r.value === state.size;
  });
}

function buildOptionRows() {
  const layoutRow = $('layoutRow');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.layout = key;
      selectedPanel = 0;
      redraw();
    });
    layoutRow.appendChild(b);
  });
  const gradeRow = $('gradeRow');
  Object.entries(GRADES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.grade = key;
      redraw();
    });
    gradeRow.appendChild(b);
  });
  const styleRow = $('styleRow');
  Object.entries(TITLE_STYLES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.style = key;
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state.titleStyle = key;
      redraw();
    });
    styleRow.appendChild(b);
  });
  const sizeRow = $('sizeRow');
  Object.entries(SIZES).forEach(([key, def]) => {
    const label = document.createElement('label');
    label.className = 'sizeChoice';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'size';
    radio.value = key;
    radio.addEventListener('change', () => {
      state.size = key;
      redraw();
    });
    label.appendChild(radio);
    label.appendChild(document.createTextNode(def.label));
    sizeRow.appendChild(label);
  });
}

/** Puts an image in the first free photo slot (or replaces slot 1). */
export async function addPhoto(img) {
  const free = state.photos.findIndex((p) => !p);
  const slot = free === -1 ? 0 : free;
  state.photos[slot] = img;
  state.panels.forEach((p) => {
    if (p.photo === null || p.photo === undefined) p.photo = slot;
  });
  renderTray();
  redraw();
  return slot;
}

export async function loadSample(index) {
  const sample = SAMPLES[index];
  const img = await loadImage(sample.url);
  const slot = await addPhoto(img);
  setStatus(`Loaded sample photo “${sample.name}” into slot ${slot + 1}.`);
  return slot;
}

/** Exports the current cover at full size as a PNG download. */
export async function exportPNG() {
  const { w, h } = currentSize();
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), state, w, h);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neon-sunset-cover-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  window.__lastExport = { width: w, height: h, bytes: blob.size, name: a.download };
  setStatus(`Saved ${a.download} (${(blob.size / 1024).toFixed(0)} KB).`);
  return window.__lastExport;
}

/** Canvas point (client coords) -> cover coords, for panel picking. */
function toCoverCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const { w, h } = currentSize();
  return {
    x: ((event.clientX - rect.left) / rect.width) * w,
    y: ((event.clientY - rect.top) / rect.height) * h,
  };
}

function panelAt(x, y) {
  const panels = layoutPanels(state.layout, currentSize().w, currentSize().h);
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const r = panels[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function bindCanvas() {
  canvas.addEventListener('pointerdown', (event) => {
    const { x, y } = toCoverCoords(event);
    const hit = panelAt(x, y);
    if (hit === -1) return;
    selectedPanel = hit;
    const p = state.panels[hit];
    drag = { x, y, ox: p.ox, oy: p.oy };
    canvas.setPointerCapture(event.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const { x, y } = toCoverCoords(event);
    const { w, h } = currentSize();
    const p = state.panels[selectedPanel];
    const rect = layoutPanels(state.layout, w, h)[selectedPanel];
    // Dragging moves the focal point: the photo follows the pointer.
    const img = p.photo != null ? state.photos[p.photo] : null;
    if (!img) return;
    const zoom = p.zoom || 1;
    const s = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
    const pw = img.naturalWidth * s;
    const ph = img.naturalHeight * s;
    p.ox = clamp(drag.ox - (x - drag.x) / Math.max(1, pw - rect.w), 0, 1);
    p.oy = clamp(drag.oy - (y - drag.y) / Math.max(1, ph - rect.h), 0, 1);
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const { x, y } = toCoverCoords(event);
    const hit = panelAt(x, y);
    if (hit === -1) return;
    selectedPanel = hit;
    const p = state.panels[hit];
    p.zoom = clamp((p.zoom || 1) * (event.deltaY < 0 ? 1.08 : 0.93), 1, 3);
    redraw();
  }, { passive: false });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function bindControls() {
  $('photoFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const img = await readLocalFile(file);
      const slot = await addPhoto(img);
      setStatus(`Loaded “${file.name}” into slot ${slot + 1}.`);
    } catch {
      setStatus('That file could not be read as an image.');
    }
    event.target.value = '';
  });
  $('samplePier').addEventListener('click', () => loadSample(0).catch(() => setStatus('Sample photo failed to load.')));
  $('sampleBoulevard').addEventListener('click', () => loadSample(1).catch(() => setStatus('Sample photo failed to load.')));
  $('fillAll').addEventListener('click', () => {
    const first = state.photos.findIndex((p) => p);
    if (first === -1) {
      setStatus('Load a photo first, then fill every panel with it.');
      return;
    }
    state.panels.forEach((p) => { p.photo = first; });
    redraw();
    setStatus(`Every panel now shows photo ${first + 1}.`);
  });
  $('title').addEventListener('input', (event) => {
    state.title = event.target.value;
    redraw();
  });
  $('subtitle').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    redraw();
  });
  $('frame').addEventListener('change', (event) => {
    state.frame = event.target.checked;
    redraw();
  });
  $('zoom').addEventListener('input', (event) => {
    state.panels[selectedPanel].zoom = Number(event.target.value) / 100;
    redraw();
  });
  $('centerPhoto').addEventListener('click', () => {
    const p = state.panels[selectedPanel];
    p.ox = 0.5;
    p.oy = 0.5;
    p.zoom = 1;
    redraw();
  });
  $('export').addEventListener('click', () => {
    exportPNG().catch(() => setStatus('Export failed — try again.'));
  });
}

// The app object the screenshot scenes drive (see shots.js).
const app = { state, redraw, renderTray, loadSample, addPhoto, exportPNG, loadImage, setStatus };

buildOptionRows();
bindControls();
bindCanvas();
renderTray();
window.__app = app;

// Wait for the display font, then paint the first cover.
if (document.fonts && document.fonts.ready) {
  document.fonts.load('100px "Archivo Black"').catch(() => {});
  document.fonts.ready.then(() => redraw());
} else {
  redraw();
}
redraw();

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), app).catch((err) => {
    setStatus(`Shot failed: ${err.message}`);
  });
}
