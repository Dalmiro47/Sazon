import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'pw-result.png', fullPage: true });
  console.log('Screenshot saved: pw-result.png');
  await browser.close();
})();
