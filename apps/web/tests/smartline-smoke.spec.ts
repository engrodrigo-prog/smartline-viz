import { test, expect } from '@playwright/test';

test.describe('SmartLine AssetHealth – smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Smartline AssetHealth/i);
    await expect(page.getByRole('heading', { name: /AssetHealth/i })).toBeVisible();
    await expect(page.getByText('Monitoramento Inteligente de Ativos Elétricos')).toBeVisible();
  });

  test('dashboard is reachable', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard Principal/i })).toBeVisible();
  });

  test('map view is reachable', async ({ page }) => {
    await page.goto('/visual/mapa');
    await expect(page.getByText(/Mapa de Eventos/i)).toBeVisible();
  });

  test('upload hub is reachable', async ({ page }) => {
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: /Upload Unificado/i })).toBeVisible();
  });
});
