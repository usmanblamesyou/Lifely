const { _electron: electron } = require('playwright');
const path = require('path');

delete process.env.ELECTRON_RUN_AS_NODE;

const ARTIFACT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\802d44e5-6f59-4efb-b1cc-c66f1646adf4';

(async () => {
  console.log('--- CAPTURING JOURNAL VIEW FIX ---');

  const app = await electron.launch({
    args: ['.'],
    cwd: 'c:\\Users\\USER\\Desktop\\Lifely',
  });

  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.waitForTimeout(1500);

  // Navigate to Journal
  await page.click('button.sidebar-link:has-text("Journal")');
  await page.waitForTimeout(800);

  const ss = path.join(ARTIFACT_DIR, 'journal_view_fixed.png');
  await page.screenshot({ path: ss });
  console.log('Captured Journal View:', ss);

  await app.close();
})();
