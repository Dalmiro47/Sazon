import { test, expect } from '@playwright/test';

test.describe('suggest recipe filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sugerir receta/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('fit and fat chips are visible and initially unselected', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const fitChip = dialog.getByRole('button', { name: /fit/i });
    const fatChip = dialog.getByRole('button', { name: /fat/i });
    await expect(fitChip).toBeVisible();
    await expect(fatChip).toBeVisible();
    // Neither should have the active green background by default
    await expect(fitChip).not.toHaveClass(/bg-\[#5C7A3E\]/);
    await expect(fatChip).not.toHaveClass(/bg-\[#5C7A3E\]/);
  });

  test('selecting fit chip activates it and deselects on second click', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const fitChip = dialog.getByRole('button', { name: /fit/i });
    // First click — activates
    await fitChip.click();
    await expect(fitChip).toHaveClass(/bg-\[#5C7A3E\]/);
    // Second click — deactivates
    await fitChip.click();
    await expect(fitChip).not.toHaveClass(/bg-\[#5C7A3E\]/);
  });

  test('only one of fit/fat can be active at a time', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    const fitChip = dialog.getByRole('button', { name: /fit/i });
    const fatChip = dialog.getByRole('button', { name: /fat/i });
    await fitChip.click();
    await expect(fitChip).toHaveClass(/bg-\[#5C7A3E\]/);
    await fatChip.click();
    await expect(fatChip).toHaveClass(/bg-\[#5C7A3E\]/);
    await expect(fitChip).not.toHaveClass(/bg-\[#5C7A3E\]/);
  });

  test('category chips are visible and toggle on click', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    // "Plato fuerte" maps to category "main"
    const mainChip = dialog.getByRole('button', { name: 'Plato fuerte' });
    await expect(mainChip).toBeVisible();
    await mainChip.click();
    await expect(mainChip).toHaveClass(/bg-\[#5C7A3E\]/);
    // Second click deselects
    await mainChip.click();
    await expect(mainChip).not.toHaveClass(/bg-\[#5C7A3E\]/);
  });

  test('free text input and sugerir button are present', async ({ page }) => {
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByPlaceholder(/pollo con papas|rápido|vegetariano/i)
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Sugerir' })).toBeVisible();
  });
});
