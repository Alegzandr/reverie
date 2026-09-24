// Renders og-card.html to public/og-image.png with a local headless Chrome,
// so the share card needs no extra dependency. Override the binary with CHROME_PATH.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
// Headless Chrome can shoot before the webfont and the poster decode.
const RENDER_BUDGET_MS = 3000;

const here = dirname(fileURLToPath(import.meta.url));
const source = pathToFileURL(resolve(here, 'og-card.html')).href;
const output = resolve(here, '../../public/og-image.png');

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) throw new Error('Chrome not found; set CHROME_PATH.');

execFileSync(chrome, [
  '--headless=new',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--force-device-scale-factor=1',
  `--window-size=${CARD_WIDTH},${CARD_HEIGHT}`,
  `--virtual-time-budget=${RENDER_BUDGET_MS}`,
  `--screenshot=${output}`,
  source,
], { stdio: 'inherit' });

console.log(`OG card written to ${output}`);
