// Fixed scenes for screenshots: ?shot=cover shows the cover alone at the
// chosen size, ?shot=editor shows the editor with photos loaded. The query
// picks the sample photos, layout, grade and caption; window.__shotReady is
// set once the scene is painted, so a screenshot tool can wait for it.
//
//   ?shot=cover&size=1920x1080&layout=hero&grade=sunset
//     &photo=pier&photo2=boulevard&caption=SUNSET%20HEIST
//   ?shot=editor&layout=grid&grade=neon&caption=BOULEVARD%20QUEEN

/** Waits until the display font is usable, then paints once. */
async function ready(app) {
  try {
    await document.fonts.load('100px "Archivo Black"');
    await document.fonts.ready;
  } catch {
    // The fallback stack still paints: never block a shot on a font.
  }
  app.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

export async function runShot(shot, query, app) {
  const state = app.state;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') || 'hero';
  state.grade = query.get('grade') || 'sunset';
  state.title = query.get('caption') || 'SUNSET HEIST';
  state.subtitle = query.get('subtitle') || 'NEON SUNSET • 2026';
  state.titleStyle = query.get('style') || 'sunset';
  state.size = query.get('size') || '1080x1080';
  state.frame = query.get('frame') !== '0';
  // photo / photo2 / photo3 name sample files; each fills the next slot.
  const names = [query.get('photo'), query.get('photo2'), query.get('photo3')].filter(Boolean);
  const samples = names.length ? names : ['pier', 'boulevard'];
  for (const name of samples) {
    const img = await app.loadImage(`samples/${name}.jpg`);
    await app.addPhoto(img);
  }
  // Spread the loaded photos across the panels, one per panel in turn.
  const loaded = state.photos.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
  if (loaded.length) {
    state.panels.forEach((p, i) => {
      p.photo = loaded[i % loaded.length];
    });
  }
  // Per-panel framing overrides: z<i> zoom, x<i>/y<i> focal point (0..1).
  state.panels.forEach((p, i) => {
    const z = Number(query.get(`z${i}`));
    const x = Number(query.get(`x${i}`));
    const y = Number(query.get(`y${i}`));
    if (Number.isFinite(z) && z > 0) p.zoom = z;
    if (Number.isFinite(x)) p.ox = Math.min(1, Math.max(0, x));
    if (Number.isFinite(y)) p.oy = Math.min(1, Math.max(0, y));
  });
  app.renderTray();
  await ready(app);
}
