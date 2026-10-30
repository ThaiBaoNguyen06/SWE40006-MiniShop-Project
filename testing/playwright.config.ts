import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests',
 reporter: [['list'], ['html', { open: 'never' }]],
 use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:8282', browserName: 'chromium', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
