import { test, expect } from '@playwright/test';

async function expectProtectedPageOrLogin(
  page: import('@playwright/test').Page,
  path: string,
  expectedContent: RegExp,
) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    return;
  }

  await expect(page.getByText(expectedContent)).toBeVisible();
}

test.describe('SmartLine AssetHealth – smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Smartline AssetHealth/i);
    await expect(page.getByRole('heading', { name: /AssetHealth/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Acessar Sistema|Access System/i })).toBeVisible();
  });

  test('dashboard is reachable', async ({ page }) => {
    await expectProtectedPageOrLogin(page, '/dashboard', /Dashboard Principal/i);
  });

  test('map view is reachable', async ({ page }) => {
    await expectProtectedPageOrLogin(page, '/visual/mapa', /Mapa Interativo/i);
  });

  test('upload hub is reachable', async ({ page }) => {
    await expectProtectedPageOrLogin(page, '/upload', /Upload Unificado/i);
  });

  test('environmental placeholder replacements are reachable', async ({ page }) => {
    await expectProtectedPageOrLogin(page, '/ambiental/distancia', /Distâncias de Segurança/i);
    await expectProtectedPageOrLogin(page, '/ambiental/compliance', /Compliance Ambiental/i);
  });

  test('structure placeholder replacements are reachable', async ({ page }) => {
    await expectProtectedPageOrLogin(page, '/estrutura/compliance', /Compliance de Travessias/i);
    await expectProtectedPageOrLogin(page, '/estrutura/corrosao', /Corrosão e Furto de Peças/i);
  });
});
