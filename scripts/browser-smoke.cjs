const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const pageUrl = process.env.PAGE_URL;
if (!pageUrl) throw new Error('PAGE_URL is required');
const outDir = 'browser-report';
fs.mkdirSync(outDir, { recursive: true });

async function checkViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(String(err)));

  const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`${name}: page returned ${response?.status()}`);
  await page.waitForSelector('#appTitle', { state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#calendar')?.children.length > 0);
  const title = await page.title();
  if (!/シフト管理/.test(title)) throw new Error(`${name}: unexpected title: ${title}`);

  await page.click('#settingsBtn');
  await page.waitForSelector('#settingsModal.show', { state: 'visible' });
  await page.click('[data-close="settingsModal"]');
  await page.waitForFunction(() => !document.querySelector('#settingsModal')?.classList.contains('show'));

  await page.click('#addEmployeeBtn');
  await page.waitForSelector('#employeeModal.show', { state: 'visible' });
  await page.fill('#employeeName', '動作確認');
  await page.click('#employeeForm button[type="submit"]');
  await page.waitForFunction(() => document.querySelector('#employeeList')?.textContent.includes('動作確認'));

  const geometry = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    appTitle: document.querySelector('#appTitle')?.textContent?.trim(),
    employeeCount: document.querySelectorAll('.employee-item').length,
    calendarCells: document.querySelectorAll('#calendar .cell, #calendar .day-head, #calendar .row-label').length,
    serviceWorker: 'serviceWorker' in navigator
  }));
  if (!geometry.appTitle || geometry.employeeCount < 1 || geometry.calendarCells < 1) {
    throw new Error(`${name}: core UI did not render: ${JSON.stringify(geometry)}`);
  }
  if (geometry.bodyWidth > geometry.viewportWidth + 4) {
    throw new Error(`${name}: body overflows viewport (${geometry.bodyWidth} > ${geometry.viewportWidth})`);
  }
  if (consoleErrors.length || pageErrors.length) {
    throw new Error(`${name}: runtime errors: ${JSON.stringify({ consoleErrors, pageErrors })}`);
  }

  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  await context.close();
  return geometry;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const mobile = await checkViewport(browser, 'mobile-390', { width: 390, height: 844 });
    const desktop = await checkViewport(browser, 'desktop-1280', { width: 1280, height: 900 });
    const report = { ok: true, pageUrl, checkedAt: new Date().toISOString(), mobile, desktop };
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(err => {
  fs.writeFileSync(path.join(outDir, 'failure.txt'), String(err?.stack || err));
  console.error(err);
  process.exit(1);
});
