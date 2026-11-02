import { createGame, legalMoves, playMove } from '../../src/game/engine';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});
test('solo play, AI, save reload, hint, undo, replay and new game', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await expect(page.getByRole('heading', { name: 'Chaque graine compte.' })).toBeVisible();
  await page.locator('[data-pit="2"]').click();
  await expect(page.getByText('Coup 02', { exact: true })).toBeVisible({ timeout: 6000 });
  await page.reload();
  await expect(page.getByText('Coup 02', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Un conseil' }).click();
  await expect(page.locator('.hint-note')).toBeVisible({ timeout: 6000 });
  const hinted = page.locator('.pit-hint');
  await expect(hinted).toHaveCount(1);
  await page.getByRole('button', { name: 'Revoir le coup 1, S3', exact: true }).click();
  await expect(page.getByText('Relecture · coup 1')).toBeVisible();
  await expect(page.locator('.pit-playable')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reprendre la partie' }).click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.getByText('Coup 00', { exact: true })).toBeVisible();
  await expect(page.locator('[data-pit="2"] .pit-count')).toHaveText('5');
  await expect(page.locator('body')).not.toContainText('NaN');
  expect(errors).toEqual([]);
});
test('local two player setup and alternating turns', async ({ page }) => {
  await page.getByRole('button', { name: 'Nouvelle partie', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'À deux' }).click();
  await modal.getByLabel('Joueur du camp sud').fill('Alice');
  await modal.getByLabel('Joueur du camp nord').fill('Bob');
  await modal.getByRole('button', { name: 'C’est parti' }).click();
  await expect(page.getByText('Au tour de Alice')).toBeVisible();
  await page.locator('[data-pit="0"]').click();
  await expect(page.getByText('Au tour de Bob')).toBeVisible();
  await page.locator('[data-pit="7"]').click();
  await expect(page.getByText('Au tour de Alice')).toBeVisible();
});
test('rules, settings, import validation and transfer', async ({ page }) => {
  await page.getByRole('button', { name: 'Aide et règles' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'J’ai compris, à moi de jouer' }).click();
  await page.getByRole('button', { name: 'Mes parties', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^songo-.*\.json$/);
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"bad":true}'),
  });
  await expect(page.getByRole('status')).toContainText('Sauvegarde invalide');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('songo.session.v2')!));
  saved.moves = [2, 9];
  saved.names = ['Importé', 'Esprit Songo'];
  await page.locator('input[type=file]').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(saved)),
  });
  await expect(page.getByText('Coup 02', { exact: true })).toBeVisible();
  await expect(page.getByText('Au tour de Importé')).toBeVisible();
  await page.getByRole('button', { name: 'Apprendre', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'La stratégie se transmet.' })).toBeVisible();
});
test('preferences persist and settings are accessible on mobile', async ({ page }) => {
  await page.getByRole('button', { name: 'Ouvrir les préférences' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('switch', { name: /Animations/ }).uncheck();
  await modal.getByRole('switch', { name: /Repères des cases/ }).uncheck();
  await modal.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.locator('.coordinate')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('.coordinate')).toHaveCount(0);
});
test('finished games record one result and clearing statistics preserves the board', async ({
  page,
}) => {
  let game = createGame();
  const moves: number[] = [];
  let seed = 8;
  while (game.status === 'playing') {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const legal = legalMoves(game),
      pit = legal[seed % legal.length];
    moves.push(pit);
    game = playMove(game, pit);
  }
  const session = {
    version: 2,
    id: 'finished-e2e',
    names: ['Alice', 'Bob'],
    mode: 'local',
    difficulty: 'discovery',
    moves,
    createdAt: new Date().toISOString(),
  };
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'finished.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(session)),
    });
  await expect(page.locator('.result-banner')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Mes parties', exact: true }).click();
  await expect(page.locator('.results-table .result-tag')).toHaveCount(1);
  await page.getByRole('button', { name: 'Effacer l’historique' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Effacer les résultats' }).click();
  await expect(page.getByRole('heading', { name: 'Tout reste à jouer.' })).toBeVisible();
  await page.getByRole('button', { name: 'Revoir le plateau' }).click();
  await expect(page.locator('.result-banner')).toBeVisible();
});
test('works offline after service worker activation', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Chaque graine compte.' })).toBeVisible();
  await page.locator('[data-pit="0"]').click();
  await expect(page.getByText('Coup 02', { exact: true })).toBeVisible({ timeout: 6000 });
  await context.setOffline(false);
});
test('layout fits viewport and controls meet accessibility rules', async ({ page }, testInfo) => {
  await expect(page.locator('.wood-board')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: `test-results/songo-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.any.map((a) => a.data) })),
    })),
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/songo-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
