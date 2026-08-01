const { _electron: electron } = require('playwright');
const path = require('path');

delete process.env.ELECTRON_RUN_AS_NODE;

const ARTIFACT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\802d44e5-6f59-4efb-b1cc-c66f1646adf4';

(async () => {
  console.log('--- STARTING ALL FIXES VERIFICATION & SCREENSHOT CAPTURES ---');

  const app = await electron.launch({
    args: ['.'],
    cwd: 'c:\\Users\\USER\\Desktop\\Lifely',
  });

  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.waitForTimeout(1500);

  // Ensure test data exists
  await page.evaluate(async () => {
    try {
      await window.electronAPI.habits.create({
        name: 'Morning Workout',
        type: 'build',
        repeat_type: 'daily',
        goal_count: 1,
        goal_period: 'day',
        time_of_day: ['morning'],
        start_date: '2026-07-30',
        end_condition: 'never',
      });
    } catch (e) {}

    try {
      const entries = await window.electronAPI.journal.getForDate('2026-07-30');
      if (!entries || entries.length === 0) {
        const newEntry = await window.electronAPI.journal.createEntry('2026-07-30');
        await window.electronAPI.journal.updateEntry({
          id: newEntry.id,
          content: 'Reflecting on today\'s achievements and progress.',
          mood: 'good',
          ended_at: new Date().toISOString(),
        });
      }
    } catch (e) {}
  });

  await page.reload();
  await page.waitForTimeout(1000);

  // 1. Screenshot 1: Today view showing habit card left-aligned with hover drag handle and right action button
  await page.click('button.sidebar-link:has-text("Today")');
  await page.waitForTimeout(500);
  const habitCard = page.locator('.habit-card').first();
  if (await habitCard.isVisible()) {
    await habitCard.hover();
    await page.waitForTimeout(300);
  }
  const ss1 = path.join(ARTIFACT_DIR, 'fix1_today_left_aligned_habit_card.png');
  await page.screenshot({ path: ss1 });
  console.log('Captured Fix 1:', ss1);

  // 2. Screenshot 2: Mini calendar open showing 7-column grid layout
  await page.click('#topbar-date-trigger');
  await page.waitForSelector('.mini-calendar-dropdown', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(400);
  const ss2 = path.join(ARTIFACT_DIR, 'fix2_mini_calendar_7_col_grid.png');
  await page.screenshot({ path: ss2 });
  console.log('Captured Fix 2:', ss2);

  // Close calendar
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 3. Screenshot 3: Progress heatmap showing full July month within visible screen
  await page.click('button.sidebar-link:has-text("Progress")');
  await page.waitForTimeout(800);
  const ss3 = path.join(ARTIFACT_DIR, 'fix3_progress_heatmap_july.png');
  await page.screenshot({ path: ss3 });
  console.log('Captured Fix 3:', ss3);

  // 4. Screenshot 4: Bar graph with bar group clicked showing persistent tooltip
  const firstBarGroup = page.locator('svg g[style*="cursor: pointer"]').first();
  if (await firstBarGroup.isVisible()) {
    await firstBarGroup.click();
    await page.waitForTimeout(300);
  }
  const ss4 = path.join(ARTIFACT_DIR, 'fix4_bargraph_clicked_tooltip.png');
  await page.screenshot({ path: ss4 });
  console.log('Captured Fix 4:', ss4);

  // 5. Screenshot 5: All Habits view with Edit option in ⋯ menu
  await page.click('button.sidebar-link:has-text("All Habits")');
  await page.waitForTimeout(800);
  const habitRowMenuBtn = page.locator('button.habit-action-menu-btn').first();
  if (await habitRowMenuBtn.isVisible()) {
    await habitRowMenuBtn.click();
    await page.waitForTimeout(300);
  }
  const ss5 = path.join(ARTIFACT_DIR, 'fix5_all_habits_edit_menu.png');
  await page.screenshot({ path: ss5 });
  console.log('Captured Fix 5:', ss5);

  // 6. Screenshot 6: Journal entry card with properly styled Lock, Edit, Delete buttons
  await page.click('button.sidebar-link:has-text("Journal")');
  await page.waitForTimeout(800);
  const ss6 = path.join(ARTIFACT_DIR, 'fix6_journal_styled_action_buttons.png');
  await page.screenshot({ path: ss6 });
  console.log('Captured Fix 6:', ss6);

  await app.close();
  console.log('--- ALL FIXES SCREENSHOT CAPTURES COMPLETED SUCCESSFULLY ---');
})();
