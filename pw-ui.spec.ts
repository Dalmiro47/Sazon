import { test, expect } from '@playwright/test';

test('recipe listing page UI', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Search bar exists
  await expect(page.getByPlaceholder('Buscar recetas...')).toBeVisible();

  // At least one recipe card renders
  await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible();

  // Search filters cards
  await page.fill('[placeholder="Buscar recetas..."]', 'pasta');
  await expect(page.getByText('Pasta con Tomate', { exact: false })).toBeVisible();

  // Delete button exists on card (hover)
  const card = page.locator('[data-testid="recipe-card"]').first();
  await card.hover();
  await expect(card.locator('button[aria-label="Eliminar"]')).toBeVisible();

  // Category badge doesn't overflow
  const badge = page.locator('[data-testid="category-badge"]').first();
  const box = await badge.boundingBox();
  expect(box!.height).toBeLessThan(40); // single line
});
