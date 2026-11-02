import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function localGame(page: Page) {
  await page.getByRole('button', { name: 'Nouvelle partie', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'À deux' }).click();
  await page.getByRole('button', { name: 'C’est parti' }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('selection previews the circuit, can be changed or cancelled, and commits only on confirmation', async ({
  page,
}) => {
  await localGame(page);
  const pit = page.locator('[data-pit="2"]');
  await pit.click();
  await expect(pit).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pit-landing')).toHaveAttribute('data-pit', '7');
  await expect(page.getByText('Coup 00', { exact: true })).toBeVisible();
  await page.locator('[data-pit="3"]').click();
  await expect(pit).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-pit="3"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Annuler la sélection' }).click();
  await expect(page.locator('.pit-selected')).toHaveCount(0);
  await expect(page.getByText('Coup 00', { exact: true })).toBeVisible();
  await pit.click();
  await page.getByRole('button', { name: 'Semer 5 graines' }).click();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.pit-playable')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler', exact: true })).toBeDisabled();
  await expect(page.locator('[data-pit="2"] .pit-count')).toHaveText('0');
  await expect(page.locator('[data-pit="3"] .pit-count')).toHaveText('6');
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.pit-playable').first()).toHaveAttribute('data-pit', '7');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('songo.session.v2')!).moves),
  ).toEqual([2]);
});

test('touch selection and a second tap sow without a synthetic hover selection', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch device');
  await localGame(page);
  await page.locator('[data-pit="0"]').tap();
  await expect(page.locator('.pit-selected')).toHaveAttribute('data-pit', '0');
  await page.locator('[data-pit="0"]').tap();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByText('Coup 01', { exact: true })).toBeVisible();
  await expect(page.locator('.pit-selected')).toHaveCount(0);
});

test('reduced motion skips the timeline and preserves the same legal result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await localGame(page);
  await page.locator('[data-pit="0"]').click();
  await page.getByRole('button', { name: 'Semer 5 graines' }).click();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.flying-seed')).toHaveCount(0);
  await expect(page.locator('[data-pit="0"] .pit-count')).toHaveText('0');
  await expect(page.locator('[data-pit="1"] .pit-count')).toHaveText('6');
  await expect(page.getByText('Coup 01', { exact: true })).toBeVisible();
});

test('opening settings during a semis cancels visuals and releases the next turn', async ({
  page,
}) => {
  await localGame(page);
  await page.locator('[data-pit="0"]').click();
  await page.getByRole('button', { name: 'Semer 5 graines' }).click();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'true');
  await page.getByRole('button', { name: 'Ouvrir les préférences' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.flying-seed')).toHaveCount(0);
  await expect(page.locator('[data-pit="7"]')).toBeEnabled();
  await expect(page.locator('[data-pit="0"] .pit-count')).toHaveText('0');
});

test('small portraits and landscape keep touch targets usable and the game state intact', async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(!isMobile, 'Mobile geometry');
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [390, 844],
    [430, 932],
    [844, 390],
    [768, 1024],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const targets = await page.locator('.pit-playable').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }),
    );
    expect(targets).toHaveLength(7);
    for (const rect of targets) {
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 390) {
      await page.locator('[data-pit="2"]').tap();
      await page.screenshot({
        path: `test-results/selection-${testInfo.project.name}.png`,
        fullPage: true,
      });
      await page.getByRole('button', { name: 'Annuler la sélection' }).click();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const southTop = await page.locator('[data-pit="0"]').boundingBox();
  const southBottom = await page.locator('[data-pit="6"]').boundingBox();
  const northTop = await page.locator('[data-pit="13"]').boundingBox();
  expect(southTop!.y).toBeLessThan(southBottom!.y);
  expect(northTop!.x).toBeLessThan(southTop!.x);
  await expect(page.getByText('Coup 00', { exact: true })).toBeVisible();
});

test('immersive mode gives the board the screen and the menu remains accessible', async ({
  page,
}) => {
  const enter = page.getByRole('button', { name: 'Agrandir le plateau' });
  if (await enter.isVisible()) await enter.click();
  await expect(page.getByRole('navigation')).toBeHidden();
  await expect(page.locator('.wood-board')).toBeVisible();
  await page.getByRole('button', { name: 'Quitter le mode immersif' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('button', { name: 'Apprendre', exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Mes parties', exact: true }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Ouvrir les préférences' }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
});

test('the human move is saved before animation ends and a reload lets the AI resume', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('[data-pit="2"]').click();
  await page.getByRole('button', { name: 'Semer 5 graines' }).click();
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-pit="3"] .pit-count')).toHaveText('6');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('songo.session.v2')!).moves),
  ).toEqual([2]);
  await page.reload();
  await expect(page.getByText('Coup 02', { exact: true })).toBeVisible({ timeout: 6000 });
  await expect(page.locator('.board-area')).toHaveAttribute('aria-busy', 'false');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('songo.session.v2')!).moves.length),
  ).toBe(2);
  expect(errors).toEqual([]);
});

test('landscape menu is accessible on first load and after leaving the arena', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.getByRole('button', { name: 'Apprendre', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La stratégie se transmet.' })).toBeVisible();
  await page.getByRole('button', { name: 'Jouer', exact: true }).click();
  await page.getByRole('button', { name: 'Agrandir le plateau' }).click();
  await expect(page.getByRole('navigation')).toBeHidden();
  await page.getByRole('button', { name: 'Quitter le mode immersif' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
