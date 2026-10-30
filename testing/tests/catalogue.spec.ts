import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const expectedCatalogue = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../backend/catalogue/products.json'), 'utf8'));
test('catalogue renders real database products through Nginx and Express', async ({ page }, testInfo) => {
 const responsePromise = page.waitForResponse(r => r.url().endsWith('/api/products'));
 await page.goto('/');
 const response = await responsePromise;
 expect(response.status()).toBe(200);
 const body = await response.json();
 expect(body.count).toBe(expectedCatalogue.length);
 await expect(page.getByRole('heading', { name: 'MiniShop', exact: true })).toBeVisible();
 await expect(page.locator('.product-card')).toHaveCount(body.count);
 for (const product of body.products) {
  const card = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: product.name, exact: true }) });
  await expect(card).toContainText('$' + Number(product.price).toFixed(2));
  await expect(card).toContainText('Stock: ' + product.stock_quantity + ' available');
 }
 await expect(page.getByText('Unable to load products from the backend.')).toHaveCount(0);
 await page.screenshot({ path: testInfo.outputPath('catalogue.png'), fullPage: true });
});
test('live database and deployed release are healthy', async ({ request }) => {
 const health = await request.get('/api/db-health');
 expect(health.ok()).toBeTruthy();
 expect(await health.json()).toMatchObject({ status: 'ok', database: 'connected' });
 const response = await request.get('/api/health');
 expect(response.ok()).toBeTruthy();
 const body = await response.json();
 expect(body).toMatchObject({ status: 'ok', application: 'MiniShop' });
 if (process.env.EXPECTED_RELEASE) expect(body.release).toBe(process.env.EXPECTED_RELEASE);
});

test('empty catalogue displays the empty-state message', async ({ page }) => {
 await page.route('**/api/products', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', count: 0, products: [] }) }));
 await page.goto('/');
 await expect(page.getByText('No products are currently available.')).toBeVisible();
 await expect(page.locator('.product-card')).toHaveCount(0);
});
test('API failure displays a useful message without product cards', async ({ page }) => {
 await page.route('**/api/products', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error' }) }));
 await page.goto('/');
 await expect(page.getByText('Unable to load products from the backend.')).toBeVisible();
 await expect(page.locator('.product-card')).toHaveCount(0);
});

test('product editor submits a proposal and shows local review status', async ({ page }) => {
 await page.route('**/api/product-proposals/config', route => route.fulfill({ json: { enabled: true, mode: 'local', stagingUrl: 'http://localhost:8283', productionUrl: 'http://localhost:8284' } }));
 await page.route('**/api/product-proposals', async route => {
  expect(route.request().postDataJSON()).toMatchObject({ name: 'Browser Demo Speaker', price: '35.50', stock_quantity: 4 });
  expect(route.request().headers()['authorization']).toBe('Bearer synthetic-browser-code');
  await route.fulfill({ status: 202, json: { id: 'browser-test', status: 'queued', mode: 'local', product: { name: 'Browser Demo Speaker' } } });
 });
 await page.route('**/api/product-proposals/browser-test', route => route.fulfill({ json: { id: 'browser-test', status: 'staging_passed', mode: 'local', product: { name: 'Browser Demo Speaker' } } }));
 await page.goto('/');
 await page.getByRole('button', { name: 'Add a product', exact: true }).click();
 await page.getByLabel('Admin access code').fill('synthetic-browser-code');
 await page.getByLabel('Product name', { exact: true }).fill('Browser Demo Speaker');
 await page.getByLabel('Description', { exact: true }).fill('Speaker for browser testing');
 await page.getByLabel('Price', { exact: true }).fill('35.50');
 await page.getByLabel('Stock quantity').fill('4');
 await page.getByRole('button', { name: 'Submit for staging' }).click();
 await expect(page.getByText('Queued for testing', { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Approve production (local demo)' })).toBeVisible({ timeout: 10000 });
});

test('product editor displays an authentication failure', async ({ page }) => {
 await page.route('**/api/product-proposals/config', route => route.fulfill({ json: { enabled: true, mode: 'local', stagingUrl: 'http://localhost:8283', productionUrl: 'http://localhost:8284' } }));
 await page.route('**/api/product-proposals', route => route.fulfill({ status: 401, json: { message: 'Enter a valid admin access code.' } }));
 await page.goto('/');
 await page.getByRole('button', { name: 'Add a product', exact: true }).click();
 await page.getByLabel('Admin access code').fill('incorrect-test-code');
 await page.getByLabel('Product name', { exact: true }).fill('Browser Demo Speaker');
 await page.getByLabel('Description', { exact: true }).fill('Speaker for browser testing');
 await page.getByLabel('Price', { exact: true }).fill('35.50');
 await page.getByLabel('Stock quantity').fill('4');
 await page.getByRole('button', { name: 'Submit for staging' }).click();
 await expect(page.getByRole('alert')).toHaveText('Enter a valid admin access code.');
});
