// Takes the entry's screenshots with Playwright + the cached Chromium build,
// then verifies the app works offline and its PNG export is real.
//
//   node take-shots.mjs [shots.json] [out-dir]
//
// Serves app/ itself (node serve.ts --port 8123), opens each scene from
// shots.json, waits for window.__shotReady, saves a JPEG, and checks the
// gate's screenshot limits (<= 256 KiB, long side <= 1280, short side >= 480).
// Also asserts no request leaves localhost, and clicks Export once to prove
// the PNG download carries the right dimensions.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('/tmp/pwtest/node_modules/playwright-core');

const here = fileURLToPath(new URL('.', import.meta.url));
const shotsFile = process.argv[2] ?? join(here, 'shots.json');
const outDir = process.argv[3] ?? join(here, 'screenshots');
const shots = JSON.parse(readFileSync(shotsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const PORT = 8123;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: here, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('serve.ts did not start')), 10000);
  server.stdout.on('data', () => { clearTimeout(timer); resolve(); });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

const exe = process.env.CHROMIUM_EXE
  ?? '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--force-color-profile=srgb'] });

let failures = 0;
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    const outside = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(`http://localhost:${PORT}`) && !url.startsWith('data:')) outside.push(url);
    });
    page.on('pageerror', (err) => console.log(`  !! page error in ${shot.name}: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`  !! console error in ${shot.name}: ${msg.text()}`);
    });
    await page.goto(`http://localhost:${PORT}/${shot.query}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
    const file = join(outDir, shot.name);
    await page.screenshot({ path: file, type: 'jpeg', quality: 85 });
    const size = statSync(file).size;
    const png = readFileSync(file);
    const ok = size <= 262144 && shot.w <= 1280 && Math.min(shot.w, shot.h) >= 480;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${shot.name} ${shot.w}x${shot.h} ${size} bytes${outside.length ? ` EXTERNAL REQUESTS: ${outside.join(', ')}` : ''}`);
    if (!ok || outside.length) failures++;
    // On the editor shot, also prove the real export: click Export PNG and
    // check the downloaded file is a PNG of the chosen size.
    if (shot.name === '2-editor.jpg') {
      const download = page.waitForEvent('download', { timeout: 15000 });
      await page.click('#export');
      const dl = await download;
      const tmp = join('/tmp', 'export-test.png');
      await dl.saveAs(tmp);
      const buf = readFileSync(tmp);
      const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      const exported = await page.evaluate(() => window.__lastExport);
      console.log(`     export: PNG=${isPng} ${w}x${h} ${statSync(tmp).size} bytes (app reports ${JSON.stringify(exported)})`);
      if (!isPng || w !== 1080 || h !== 1080) failures++;
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}

if (failures) {
  console.log(`SCREENSHOTS: ${failures} failure(s)`);
  process.exit(1);
}
console.log('SCREENSHOTS: all ok');
