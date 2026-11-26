import { expect, test, type Page, type CDPSession } from '@playwright/test';
import { clock } from '../src/time';

async function target(page: Page) {
  const rotation = await page.locator('#hour-hand').getAttribute('transform');
  return Math.round(Number(rotation?.match(/rotate\(([\d.]+)/)?.[1]) * 2);
}
async function state(page: Page) {
  return page.evaluate(() => ({
    mode: document.querySelector('[data-mode][aria-pressed="true"]')?.getAttribute('data-mode'),
    stage: (document.querySelector('#stage') as HTMLSelectElement).value,
    hour: document.querySelector('#hour-hand')?.getAttribute('transform'),
    minute: document.querySelector('#minute-hand')?.getAttribute('transform'),
    time: document.querySelector('#readout')?.textContent,
    choices: Array.from(document.querySelectorAll<HTMLButtonElement>('#choices button')).map(b => b.dataset.answer),
    success: !(document.querySelector('#success') as HTMLElement).hidden,
    reveal: !(document.querySelector('#reveal') as HTMLElement).hidden,
    hints: (document.querySelector('#hints') as HTMLInputElement).checked,
    contrast: (document.querySelector('#contrast') as HTMLInputElement).checked,
  }));
}
async function watchRewards(page: Page) {
  await page.evaluate(() => {
    const log: string[] = [];
    Object.assign(window, { rewardLog: log });
    new MutationObserver(records => {
      for (const record of records) {
        if (record.target === document.querySelector('#burst') && record.oldValue !== null
          && !(record.target as HTMLElement).hidden) log.push('burst');
        if (record.target === document.querySelector('#status')) log.push('status');
      }
    }).observe(document.querySelector('#app')!, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true,
    });
  });
}
async function rewardCount(page: Page) {
  return page.evaluate(() => (window as unknown as { rewardLog: string[] }).rewardLog.filter(x => x === 'burst').length);
}

test('correct and revealed are distinct; rewards are local, brief and not duplicated', async ({ page }) => {
  await page.goto('/');
  await watchRewards(page);
  await page.locator('[data-mode="read"]').click();
  const answer = clock(await target(page)).digital;
  await page.locator('#choices button').filter({ hasNotText: answer }).first().click();
  await expect(page.locator('#success')).toBeHidden();
  await expect(page.locator('#burst')).toBeHidden();
  await page.locator('#reveal').click();
  await expect(page.locator('#success')).toBeHidden();
  await expect(page.locator('.correct-choice')).toHaveCount(0);
  await expect(page.locator('#status')).toContainText('The time is');
  expect(await rewardCount(page)).toBe(0);
  await page.locator('#next').click();
  await page.evaluate(() => { (window as unknown as { rewardLog: string[] }).rewardLog.length = 0; });
  const correct = page.locator(`#choices button[data-answer="${await target(page)}"]`);
  await correct.click();
  await expect(page.locator('#success')).toBeVisible();
  await expect(correct).toHaveClass('correct-choice');
  await expect(correct.locator('.choice-check')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#next')).toHaveClass('primary');
  expect(await rewardCount(page)).toBe(1);
  await correct.evaluate(b => (b as HTMLButtonElement).click());
  expect(await rewardCount(page)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { rewardLog: string[] }).rewardLog.filter(x => x === 'status').length)).toBe(1);
  await expect(page.locator('#burst')).toBeHidden({ timeout: 1000 });
  await expect(page.locator('#success')).toBeVisible();
  await page.locator('#next').click();
  await expect(page.locator('#success')).toBeHidden();
  await page.locator('[data-mode="set"]').click();
  await page.locator('#check').click();
  await page.locator('[data-step="-60"]').click();
  await expect(page.locator('#status')).toBeEmpty();
  await page.locator('#check').click();
  await expect(page.locator('#success')).toBeVisible();
  expect(await rewardCount(page)).toBe(2);
  await page.locator('[data-step="60"]').click();
  await expect(page.locator('#success')).toBeHidden();
});

test('reduced motion keeps static success without a burst', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await watchRewards(page);
  await page.locator('[data-mode="set"]').click();
  await page.locator('[data-step="-60"]').click();
  await page.locator('#check').click();
  await expect(page.locator('#success')).toBeVisible();
  await expect(page.locator('#burst')).toBeHidden();
  expect(await rewardCount(page)).toBe(0);
});

for (const locale of ['et', 'et-EE', 'en-GB']) {
  test(`first preferred locale ${locale} is detected and reload resets override`, async ({ browser }) => {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto('/');
    const language = locale.startsWith('et') ? 'et' : 'en';
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page).toHaveTitle(language === 'et' ? 'Õpime kella' : 'Time to learn');
    await page.locator('#language').selectOption(language === 'et' ? 'en' : 'et');
    await page.reload();
    await expect(page.locator('#language')).toHaveValue(language);
    await context.close();
  });
}

for (const outcome of ['unanswered', 'incorrect', 'correct', 'revealed']) {
  test(`language switch preserves Read ${outcome}, preferences, choices and focus`, async ({ page }) => {
    await page.goto('/');
    await page.locator('summary').click();
    await page.locator('#stage').selectOption('3');
    await page.locator('#hints').uncheck();
    await page.locator('#contrast').check();
    await page.locator('[data-mode="read"]').click();
    await watchRewards(page);
    const correct = page.locator(`#choices button[data-answer="${await target(page)}"]`);
    if (outcome === 'correct') await correct.click();
    if (outcome === 'incorrect' || outcome === 'revealed') {
      await page.locator('#choices button').filter({ hasNotText: clock(await target(page)).digital }).first().click();
    }
    if (outcome === 'revealed') await page.locator('#reveal').click();
    const before = await state(page);
    const rewards = await rewardCount(page);
    // Dispatch a native change while another control has focus: relabeling must
    // not replace any focused node (including a selected answer).
    await page.locator('#next').focus();
    for (const language of ['et', 'en']) {
      await page.locator('#language').evaluate((el, value) => {
        (el as HTMLSelectElement).value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, language);
      expect(await state(page)).toEqual(before);
      await expect(page.locator('#next')).toBeFocused();
      expect(await rewardCount(page)).toBe(rewards);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      if (outcome === 'unanswered' || outcome === 'incorrect') {
        await expect(page.locator('#readout')).toBeHidden();
        await expect(page.locator('#clock')).not.toHaveAttribute('aria-label', /Clock showing|Kell näitab/);
      }
      if (language === 'et') {
        await expect(page.locator('#task')).toHaveText('Mis kell on?');
        await expect(page.locator('#clock')).toHaveAttribute('aria-label', /Lühike tunniosuti/);
        if (outcome === 'incorrect') await expect(page.locator('#status')).toHaveText('Veel mitte päris. Proovi uuesti.');
        if (outcome === 'correct') await expect(page.locator('#status')).toContainText('Leidsid õige aja!');
        if (outcome === 'revealed') await expect(page.locator('#status')).toContainText('Kell on');
      }
    }
  });
}

async function point(page: Page, angle: number, radius: number) {
  const box = await page.locator('#clock').boundingBox();
  if (!box) throw new Error('Clock has no bounds');
  return { x: box.x + (160 + Math.sin(angle * Math.PI / 180) * radius) * box.width / 320,
    y: box.y + (160 - Math.cos(angle * Math.PI / 180) * radius) * box.height / 320 };
}

for (const outcome of ['incorrect', 'revealed', 'correct']) {
  test(`Set ${outcome} retains its target, attempt and hint when switching languages`, async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-mode="set"]').click();
    await page.locator('#check').click();
    if (outcome === 'revealed') await page.locator('#reveal').click();
    if (outcome === 'correct') {
      await page.locator('[data-step="-60"]').click();
      await page.locator('#check').click();
    }
    const before = await state(page);
    await page.locator('#language').focus();
    await page.locator('#language').selectOption('et');
    expect(await state(page)).toEqual(before);
    await expect(page.locator('#language')).toBeFocused();
    await expect(page.locator('#status')).toContainText(outcome === 'incorrect'
      ? 'Vaata lühikest tunniosutit' : outcome === 'correct' ? 'Leidsid õige aja!' : 'Kell on');
    await page.locator('#language').selectOption('en');
    expect(await state(page)).toEqual(before);
  });
}

async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
  points: { x: number; y: number; id?: number }[]) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ ...p, radiusX: 3, radiusY: 3 })) });
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 320, height: 568 }]) {
  test(`native touch commits 7:30 to 7:40 without cancellation at ${viewport.width}px`, async ({ browser, browserName }) => {
    test.skip(browserName !== 'chromium', 'Native touch injection requires Chromium CDP.');
    const context = await browser.newContext({ hasTouch: true, viewport });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
      await page.goto('/');
      await page.locator('summary').click();
      await page.locator('#stage').selectOption('3');
      await page.locator('#clock').scrollIntoViewIfNeeded();
      await expect(page.locator('#readout')).toHaveText('7:30');
      await page.evaluate(() => {
        const events: string[] = [];
        Object.assign(window, { touchPointerEvents: events });
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
          document.addEventListener(type, event => {
            if ((event as PointerEvent).pointerType === 'touch') events.push(type);
          }, true);
        }
      });
      const start = await point(page, 180, 110);
      expect(await page.evaluate(p => {
        const hit = document.elementFromPoint(p.x, p.y);
        return {
          html: hit instanceof HTMLElement,
          hand: (hit as HTMLElement | null)?.dataset.hand,
          touchAction: hit && getComputedStyle(hit).touchAction,
        };
      }, start)).toEqual({ html: true, hand: 'minute', touchAction: 'none' });
      const scrollBefore = await page.evaluate(() => scrollY);
      await touch(cdp, 'touchStart', [{ ...start, id: 0 }]);
      await expect(page.locator('#minute-hand')).toHaveClass('active-hand');
      for (const angle of [192, 204, 216, 228, 240]) {
        await touch(cdp, 'touchMove', [{ ...await point(page, angle, 110), id: 0 }]);
      }
      await expect(page.locator('#minute-hand')).toHaveClass('active-hand');
      await expect(page.locator('#hour-hand')).toHaveAttribute('transform', 'rotate(230 160 160)');
      await touch(cdp, 'touchEnd', []);
      const events = await page.evaluate(() =>
        (window as unknown as { touchPointerEvents: string[] }).touchPointerEvents);
      expect(events).toContain('pointerup');
      expect(events).not.toContain('pointercancel');
      await expect(page.locator('#readout')).toHaveText('7:40');
      await expect(page.locator('.active-hand')).toHaveCount(0);
      expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);

      // The SVG face itself, not just the page margin, must still allow scrolling.
      const box = await page.locator('#clock').boundingBox();
      if (!box) throw new Error('Clock has no bounds');
      const x = box.x + box.width * .9;
      const y = box.y + box.height * .7;
      await touch(cdp, 'touchStart', [{ x, y, id: 0 }]);
      for (const delta of [20, 40, 60, 80, 100]) {
        await touch(cdp, 'touchMove', [{ x, y: y - delta, id: 0 }]);
      }
      await touch(cdp, 'touchEnd', []);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
      await expect(page.locator('#readout')).toHaveText('7:40');
      // Complete non-dragging alternative remains usable.
      await page.locator('#minute-back').click();
      await expect(page.locator('#readout')).toHaveText('7:39');
    } finally {
      await context.close();
    }
  });
}

test('real touch: both hands at all stages, overlap, rollover, capture, extra fingers and cancellation', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Native multi-touch injection is available through Chromium CDP only.');
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 320, height: 568 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto('/');
  // Native swipe in the page margin, outside all hand targets, still scrolls.
  await touch(cdp, 'touchStart', [{ x: 5, y: 450 }]);
  for (const y of [400, 350, 300, 250, 200]) await touch(cdp, 'touchMove', [{ x: 5, y }]);
  await touch(cdp, 'touchEnd', []);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await target(page)).toBe(450);
  await page.locator('summary').click();
  for (const mode of ['explore', 'set']) {
    for (const stage of [0, 1, 2, 3]) {
      await page.locator('#stage').selectOption(String(stage));
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.locator('#clock').scrollIntoViewIfNeeded();
      const before = await target(page);
      const p = await point(page, before / 2, 55);
      await touch(cdp, 'touchStart', [{ ...p, id: 1 }]);
      await expect(page.locator('#hour-hand')).toHaveClass('active-hand');
      const end = await point(page, before / 2 + 30, 55);
      await touch(cdp, 'touchMove', [{ ...end, id: 1 }]);
      await touch(cdp, 'touchEnd', []);
      expect(await target(page)).toBe((before + 60) % 720);
      const minuteAngle = (before % 60) * 6;
      await touch(cdp, 'touchStart', [await point(page, minuteAngle, 110)]);
      await expect(page.locator('#minute-hand')).toHaveClass('active-hand');
      const step = [30, 15, 5, 1][stage];
      // Multiple small moves avoid ambiguous jumps of exactly 180 degrees.
      for (let delta = 6; delta <= step * 6; delta += 6) {
        await touch(cdp, 'touchMove', [await point(page, minuteAngle + delta, 110)]);
      }
      await touch(cdp, 'touchEnd', []);
      expect(await target(page)).toBe((before + 60 + step) % 720);
    }
  }
  await page.locator('#stage').selectOption('3');
  await page.locator('[data-mode="explore"]').click();
  // Bring minute to zero and hour to twelve using the complete button alternative.
  let current = await target(page);
  for (let i = 0; i < current % 60; i++) await page.locator('#minute-back').click();
  current = await target(page);
  for (let i = 0; i < Math.floor(current / 60); i++) await page.locator('[data-step="-60"]').click();
  await page.locator('#clock').scrollIntoViewIfNeeded();
  expect(await target(page)).toBe(0);
  await touch(cdp, 'touchStart', [await point(page, 0, 0)]);
  await expect(page.locator('.active-hand')).toHaveCount(0);
  await touch(cdp, 'touchEnd', []);
  await touch(cdp, 'touchStart', [await point(page, 0, 110)]);
  await expect(page.locator('#minute-hand')).toHaveClass('active-hand');
  await touch(cdp, 'touchMove', [await point(page, 30, 110)]);
  await touch(cdp, 'touchCancel', []);
  expect(await target(page)).toBe(0);
  await touch(cdp, 'touchStart', [{ ...await point(page, 0, 55), id: 1 }]);
  await expect(page.locator('#hour-hand')).toHaveClass('active-hand');
  await touch(cdp, 'touchMove', [{ ...await point(page, -30, 55), id: 1 }]);
  await touch(cdp, 'touchEnd', []);
  expect(await target(page)).toBe(660);
  await touch(cdp, 'touchStart', [{ ...await point(page, 0, 110), id: 1 }]);
  await touch(cdp, 'touchMove', [{ ...await point(page, -30, 110), id: 1 }]);
  expect(await target(page)).toBe(655);
  await touch(cdp, 'touchStart', [{ ...await point(page, -30, 110), id: 1 }, { ...await point(page, 90, 70), id: 2 }]);
  await touch(cdp, 'touchMove', [{ ...await point(page, -30, 110), id: 1 }, { ...await point(page, 180, 70), id: 2 }]);
  expect(await target(page)).toBe(655);
  await touch(cdp, 'touchCancel', []);
  expect(await target(page)).toBe(660);
  // Captured pointer remains in control beyond the clock face and crosses 12.
  await touch(cdp, 'touchStart', [await point(page, 0, 110)]);
  await touch(cdp, 'touchMove', [await point(page, 30, 180)]);
  await touch(cdp, 'touchEnd', []);
  expect(await target(page)).toBe(665);
  await touch(cdp, 'touchStart', [await point(page, 30, 110)]);
  await touch(cdp, 'touchMove', [await point(page, 60, 110)]);
  await page.setViewportSize({ width: 568, height: 320 });
  await expect(page.locator('.active-hand')).toHaveCount(0);
  expect(await target(page)).toBe(665);
  await touch(cdp, 'touchEnd', []);
  await page.locator('[data-mode="read"]').click();
  await page.locator('#clock').scrollIntoViewIfNeeded();
  const readBefore = await target(page);
  await touch(cdp, 'touchStart', [await point(page, readBefore / 2, 55)]);
  await touch(cdp, 'touchMove', [await point(page, readBefore / 2 + 30, 55)]);
  await touch(cdp, 'touchEnd', []);
  expect(await target(page)).toBe(readBefore);
  await expect(page.locator('.active-hand')).toHaveCount(0);
  await context.close();
});

test('language change and Escape cancel a successful Set drag without repeating reward', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-mode="set"]').click();
  await page.locator('[data-step="-60"]').click();
  await watchRewards(page);
  await page.locator('#check').click();
  const before = await state(page);
  await page.locator('#clock').scrollIntoViewIfNeeded();
  const start = await point(page, (await target(page)) / 2, 55);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const end = await point(page, (await target(page)) / 2 + 30, 55);
  await page.mouse.move(end.x, end.y);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await state(page)).toEqual(before);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y);
  await page.locator('#language').evaluate(el => {
    (el as HTMLSelectElement).value = 'et';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.mouse.up();
  expect(await state(page)).toEqual(before);
  expect(await rewardCount(page)).toBe(1);
  await expect(page.locator('.active-hand')).toHaveCount(0);
});

test('Estonian narrow and enlarged layout keeps hand targets and keyboard alternatives', async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.locator('#language').selectOption('et');
  await page.locator('summary').click();
  for (const size of ['100%', '200%']) {
    await page.evaluate(s => { document.documentElement.style.fontSize = s; }, size);
    for (const mode of ['explore', 'read', 'set']) {
      await page.locator(`[data-mode="${mode}"]`).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  for (const hand of await page.locator('.hit').all()) {
    expect(await hand.evaluate(el => getComputedStyle(el).width)).toBe('52px');
    expect(await hand.evaluate(el => parseFloat(getComputedStyle(el).height))).toBeGreaterThanOrEqual(48);
    expect(await hand.evaluate(el => getComputedStyle(el).touchAction)).toBe('none');
    expect(await hand.getAttribute('class')).toBe('hit');
  }
  await page.locator('[data-step="-60"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#check').click();
  await expect(page.locator('#success')).toBeVisible();
});
