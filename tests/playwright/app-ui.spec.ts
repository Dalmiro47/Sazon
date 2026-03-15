import { test, expect } from '@playwright/test';

// Auth PIN is not set in dev, so middleware allows all traffic.

test.describe('nav banner', () => {
  test('shows Sazón title with accent', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /saz[oó]n/i }).first()).toBeVisible();
  });
});

test.describe('recipe listing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('search bar is visible', async ({ page }) => {
    await expect(page.getByPlaceholder('Buscar recetas...')).toBeVisible();
  });

  test('category filter chips are visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible();
  });

  test('Agregar receta button opens add dialog', async ({ page }) => {
    await page.getByRole('button', { name: /agregar receta/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /nueva receta/i })).toBeVisible();
  });

  test('Sugerir receta button opens suggest dialog', async ({ page }) => {
    await page.getByRole('button', { name: /sugerir receta/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /sugerir/i })).toBeVisible();
  });

  test('Sugerir and Agregar buttons are on the same row with equal flex width', async ({ page }) => {
    const sugerir = page.getByRole('button', { name: /sugerir receta/i });
    const agregar = page.getByRole('button', { name: /agregar receta/i });
    await expect(sugerir).toBeVisible();
    await expect(agregar).toBeVisible();
    const sugerirBox = await sugerir.boundingBox();
    const agregarBox = await agregar.boundingBox();
    // Same vertical position (same row)
    expect(Math.abs(sugerirBox!.y - agregarBox!.y)).toBeLessThan(10);
    // Same height
    expect(Math.abs(sugerirBox!.height - agregarBox!.height)).toBeLessThan(4);
    // Equal width (flex-1)
    expect(Math.abs(sugerirBox!.width - agregarBox!.width)).toBeLessThan(10);
  });

  test('Add dialog content is scrollable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /agregar receta/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The scrollable container exists inside the dialog
    const scrollable = dialog.locator('div.overflow-y-auto');
    await expect(scrollable).toBeVisible();
  });
});

test.describe('recipe cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('recipe cards render when recipes exist', async ({ page }) => {
    const cards = page.locator('[data-testid="recipe-card"]');
    const count = await cards.count();
    if (count === 0) {
      // No recipes seeded — acceptable in isolated test environment
      await expect(page.getByText(/no hay recetas|sin resultados/i)).toBeVisible();
      return;
    }
    await expect(cards.first()).toBeVisible();
  });

  test('clicking a recipe card opens detail dialog', async ({ page }) => {
    const cards = page.locator('[data-testid="recipe-card"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await cards.first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    // Detail dialog has Editar and Cocinar actions
    await expect(page.getByRole('link', { name: /editar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cocinar/i })).toBeVisible();
  });

  test('category badge renders on card', async ({ page }) => {
    const cards = page.locator('[data-testid="recipe-card"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const badge = page.locator('[data-testid="category-badge"]').first();
    await expect(badge).toBeVisible();
    const box = await badge.boundingBox();
    expect(box!.height).toBeLessThan(40);
  });

  test('search filters recipe cards', async ({ page }) => {
    const cards = page.locator('[data-testid="recipe-card"]');
    const count = await cards.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await page.fill('[placeholder="Buscar recetas..."]', 'zzzznosuchematch');
    await expect(page.getByText(/sin resultados/i)).toBeVisible();
  });

  test('category filter chip toggles selection', async ({ page }) => {
    const allBtn = page.getByRole('button', { name: 'Todas' });
    await expect(allBtn).toBeVisible();
    // Click a category filter chip (first non-"Todas")
    const chips = page.locator('button.rounded-full').filter({ hasNotText: 'Todas' }).filter({ hasNotText: 'Sugerir' }).filter({ hasNotText: 'Agregar' });
    const chipCount = await chips.count();
    if (chipCount === 0) {
      test.skip();
      return;
    }
    await chips.first().click();
    // "Todas" should now be unselected (white/green outline, not solid green bg)
    // The active chip gains text-white, inactive gains text-[#5C7A3E]
    await expect(chips.first()).toHaveClass(/bg-\[#5C7A3E\]/);
  });
});
