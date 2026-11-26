import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { clock, stages } from '../src/time';

async function selectStage(page: Page, index: number) {
  await page.getByText('For grown-ups', { exact: true }).click();
  await page.getByLabel('Practise these times').selectOption(String(index));
}

async function readTarget(page: Page) {
  const rotation = await page.locator('#hour-hand').getAttribute('transform');
  const angle = Number(rotation?.match(/rotate\(([\d.]+)/)?.[1]);
  expect(Number.isFinite(angle)).toBe(true);
  return Math.round(angle * 2);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Explore keeps displays synchronized at transitions and rollovers', async ({ page }) => {
  await selectStage(page, 2);
  const forward = page.getByRole('button', { name: 'Forward 5 minutes', exact: true });
  for (let i = 0; i < 5; i++) await forward.click();
  await expect(page.locator('#readout')).toHaveText('7:55');
  await expect(page.locator('#hour-hand')).toHaveAttribute('transform', 'rotate(237.5 160 160)');
  await forward.click();
  await expect(page.locator('#readout')).toHaveText('8:00');
  await expect(page.locator('#hour-hand')).toHaveAttribute('transform', 'rotate(240 160 160)');
  await page.getByLabel('Practise these times').selectOption('3');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Forward one hour' }).click();
  await expect(page.locator('#readout')).toHaveText('12:00');
  await page.getByRole('button', { name: 'Back 1 minute', exact: true }).click();
  await expect(page.locator('#readout')).toHaveText('11:59');
  await page.getByRole('button', { name: 'Forward 1 minute', exact: true }).click();
  await expect(page.locator('#readout')).toHaveText('12:00');
  await page.getByRole('button', { name: 'Back 1 minute', exact: true }).click();
  await page.getByRole('button', { name: 'Forward one hour' }).click();
  await expect(page.locator('#readout')).toHaveText('12:59');
  await page.getByRole('button', { name: 'Forward 1 minute', exact: true }).click();
  await expect(page.locator('#readout')).toHaveText('1:00');
});

for (const [index, stage] of stages.entries()) {
  test(`Read and Set allow retries and completion: ${stage.step}-minute steps`, async ({ page }) => {
    await selectStage(page, index);
    await page.getByRole('button', { name: 'Read the clock', exact: true }).click();
    const target = await readTarget(page);
    const answer = clock(target).digital;
    await expect(page.locator('#readout')).toBeHidden();
    await expect(page.getByRole('img')).not.toHaveAttribute('aria-label', /Clock showing/);
    await expect(page.getByRole('status')).toBeEmpty();
    const wrong = page.locator('#choices button').filter({ hasNotText: answer }).first();
    await wrong.click();
    await expect(page.getByRole('status')).not.toBeEmpty();
    await expect(page.getByRole('button', { name: 'Show me' })).toBeVisible();
    await page.locator('#choices').getByRole('button', { name: answer, exact: true }).click();
    await expect(page.locator('#readout')).toHaveText(answer);
    await expect(page.getByRole('status')).toContainText('You found it!');
    await page.getByRole('button', { name: 'Next clock' }).click();
    expect(await readTarget(page)).not.toBe(target);

    await page.getByRole('button', { name: 'Set the clock', exact: true }).click();
    const setTarget = await page.locator('#readout').textContent();
    await page.getByRole('button', { name: 'Check my clock' }).click();
    await expect(page.getByRole('status')).toContainText('short hour hand');
    await page.getByRole('button', { name: 'Back one hour' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Check my clock' }).click();
    await expect(page.getByRole('status')).toContainText(`You found it! The time is ${setTarget}.`);
  });
}

test('reveal, hints off and mode changes do not leak old answers', async ({ page }) => {
  await selectStage(page, 0);
  await page.getByLabel('Give hints after a try').uncheck();
  await page.getByRole('button', { name: 'Set the clock', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show me' })).toBeHidden();
  await page.getByRole('button', { name: 'Check my clock' }).click();
  await expect(page.getByRole('status')).toHaveText('Not quite yet. Have another try.');
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.getByRole('status')).toContainText('The time is');
  await page.getByRole('button', { name: 'Read the clock', exact: true }).click();
  await expect(page.getByRole('status')).toBeEmpty();
  await expect(page.locator('#readout')).toBeHidden();
});

test('visual hints identify the relevant hand and respect the hint setting', async ({ page }) => {
  await page.getByRole('button', { name: 'Set the clock', exact: true }).click();
  await page.getByRole('button', { name: 'Check my clock' }).click();
  await expect(page.locator('#hour-hand')).toHaveClass(/hint-hand/);
  await expect(page.locator('#hour-key')).toHaveClass(/hint-key/);
  await expect(page.locator('#minute-hand')).not.toHaveClass(/hint-hand/);

  await selectStage(page, 0);
  await page.getByLabel('Give hints after a try').uncheck();
  await expect(page.locator('.hint-hand, .hint-key')).toHaveCount(0);
  await page.getByLabel('Give hints after a try').check();
  await expect(page.locator('#hour-hand')).toHaveClass(/hint-hand/);

  await page.getByRole('button', { name: 'Forward 30 minutes' }).click();
  await expect(page.locator('.hint-hand, .hint-key')).toHaveCount(0);
  await page.getByRole('button', { name: 'Check my clock' }).click();
  await expect(page.locator('#minute-hand')).toHaveClass(/hint-hand/);
  await expect(page.locator('#minute-key')).toHaveClass(/hint-key/);
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('.hint-hand, .hint-key')).toHaveCount(0);

  await page.getByRole('button', { name: 'Read the clock', exact: true }).click();
  const target = await readTarget(page);
  await page.locator(`#choices button[data-answer="${(target + 60) % 720}"]`).click();
  await expect(page.locator('#hour-hand')).toHaveClass(/hint-hand/);
  await expect(page.locator('#readout')).toBeHidden();
  await expect(page.getByRole('img')).not.toHaveAttribute('aria-label', /Clock showing/);
  await page.getByRole('button', { name: 'Next clock' }).click();
  await expect(page.locator('.hint-hand, .hint-key')).toHaveCount(0);
});

test('clock supports pointer dragging across 12 and Escape cancellation', async ({ page }) => {
  await selectStage(page, 2);
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Forward 5 minutes', exact: true }).click();
  await page.locator('#clock').scrollIntoViewIfNeeded();
  const box = await page.locator('#clock').boundingBox();
  if (!box) throw new Error('Clock has no bounds');
  const point = (angle: number, radius = 110) => ({
    x: box.x + (160 + Math.sin(angle * Math.PI / 180) * radius) / 320 * box.width,
    y: box.y + (160 - Math.cos(angle * Math.PI / 180) * radius) / 320 * box.height,
  });
  const start = point(300);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const angle of [330, 360, 390]) {
    const p = point(angle);
    await page.mouse.move(p.x, p.y, { steps: 10 });
  }
  await page.mouse.up();
  await expect(page.locator('#readout')).toHaveText('8:05');
  const second = point(30);
  await page.mouse.move(second.x, second.y);
  await page.mouse.down();
  const end = point(60);
  await page.mouse.move(end.x, end.y, { steps: 10 });
  await expect(page.locator('#readout')).toHaveText('8:10');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#readout')).toHaveText('8:05');
});

test('accessible states, reduced motion, narrow reflow and no third-party requests', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:5173') external.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByLabel('Higher contrast').check();
  for (const contrast of [false, true]) {
    await page.getByLabel('Higher contrast').setChecked(contrast);
    for (const mode of ['Explore', 'Read the clock', 'Set the clock']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  for (const button of await page.locator('button:visible').all()) {
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48);
    expect(box?.width).toBeGreaterThanOrEqual(48);
  }
  expect(await page.locator('#hour-hand').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
