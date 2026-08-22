import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.QA_BASE || 'http://127.0.0.1:4173';
const OUT = path.resolve('qa-shots');

const ROUTES = [
  ['landing', '/'],
  ['products', '/products'],
  ['plans', '/plans'],
  ['about', '/about'],
  ['contact', '/contact'],
  ['legal', '/legal'],
  ['login', '/login'],
  ['register', '/register'],
  ['notfound', '/this-route-does-not-exist'],
];

const VIEWPORTS = [
  ['mobile-375', 375, 812],
  ['tablet-768', 768, 1024],
  ['desktop-1440', 1440, 900],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const failures = [];

for (const [vpName, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(`console: ${m.text()}`);
  });

  for (const [name, route] of ROUTES) {
    errs.length = 0;
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 15000 });
      const status = resp?.status() ?? 0;
      await page.waitForTimeout(400);
      const file = path.join(OUT, `${vpName}__${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const errLine = errs.length ? ` errors=${errs.length}` : '';
      console.log(`OK  ${vpName.padEnd(13)} ${name.padEnd(10)} ${status}${errLine}`);
      if (errs.length) failures.push({ vp: vpName, name, errs: [...errs] });
    } catch (e) {
      console.log(`ERR ${vpName.padEnd(13)} ${name.padEnd(10)} ${e.message}`);
      failures.push({ vp: vpName, name, errs: [e.message] });
    }
  }

  await ctx.close();
}

await browser.close();

if (failures.length) {
  console.log('\n--- FAILURES ---');
  for (const f of failures) {
    console.log(`${f.vp}/${f.name}:`);
    f.errs.forEach((e) => console.log('  ' + e));
  }
  process.exit(1);
}
console.log('\nAll routes rendered without console/page errors.');
