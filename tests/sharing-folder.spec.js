const { test, expect } = require('@playwright/test');
const { pool, getUserByRoleAndDivision, generateToken } = require('./utils');

test.describe('Sharing Folder E2E Tests', () => {

  test.afterAll(async () => {
    await pool.end();
  });

  async function injectAuth(page, role, division) {
    const user = await getUserByRoleAndDivision(role, division);
    if (!user) {
      test.skip(true, `No user found for role ${role} and division ${division}`);
      return null;
    }

    // Mock Notification permission so the mandatory push overlay auto-hides
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Notification', {
        configurable: true,
        value: { permission: 'granted', requestPermission: () => Promise.resolve('granted') }
      });
    });

    const token = generateToken(user);
    const mockUserStr = JSON.stringify({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      division: user.division,
      role: user.role,
      jabatan: user.jabatan,
      is_admin: user.is_admin
    });

    await page.goto('/');
    
    await page.evaluate(({ token, mockUserStr }) => {
      localStorage.setItem('chat_token', token);
      localStorage.setItem('chat_user', mockUserStr);
    }, { token, mockUserStr });

    await page.reload();
    await expect(page.locator('#app')).toBeVisible();

    // Sembunyikan overlay notifikasi push agar tidak memblokir klik
    await page.evaluate(() => {
      const overlay = document.getElementById('mandatory-push-overlay');
      if (overlay) overlay.classList.add('hidden');
      const dropdown = document.getElementById('notification-dropdown');
      if (dropdown) dropdown.classList.add('hidden');
    });

    // Tutup modal update sistem jika muncul (agar tidak menutupi elemen yang diklik)
    await page.locator('.system-updates-modal').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});

    return user;
  }

  test('Staff Marketing should see specific doc types and no Kontrak', async ({ page }) => {
    const user = await injectAuth(page, 'staff', 'marketing');
    if (!user) return; // skipped
    
    await expect(page.locator('#app')).toBeVisible();
    await page.click('#tab-btn-files');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('btn-sharing-folder').click());
    await expect(page.locator('#sharing-folder-view')).toBeVisible();

    await page.click('#btn-upload-doc');
    await expect(page.locator('#modal-upload-overlay')).toBeVisible();

    const options = await page.locator('#upload-doc-type option').allTextContents();
    
    // Marketing options
    expect(options).toContain('PO (Purchase Order)');
    expect(options).toContain('SPK');
    expect(options).not.toContain('Kontrak'); // Staff role filter
  });

  test('Management SDM should see Divisi tab', async ({ page }) => {
    const user = await injectAuth(page, 'management', 'sdm');
    if (!user) return; // skipped
    
    await expect(page.locator('#app')).toBeVisible();
    await page.click('#tab-btn-files');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('btn-sharing-folder').click());
    await expect(page.locator('#sharing-folder-view')).toBeVisible();

    // Should see "Divisi" tab
    await expect(page.locator('#tab-divisi-btn')).toBeVisible();
    
    await page.click('#btn-upload-doc');
    await expect(page.locator('#modal-upload-overlay')).toBeVisible();

    const options = await page.locator('#upload-doc-type option').allTextContents();
    
    // SDM options
    expect(options).toContain('Penempatan');
    expect(options).toContain('PKWT');
  });

  test('Top Management should see Semua tab', async ({ page }) => {
    const user = await injectAuth(page, 'top management', null);
    if (!user) return; // skipped
    
    await expect(page.locator('#app')).toBeVisible();
    await page.click('#tab-btn-files');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('btn-sharing-folder').click());
    await expect(page.locator('#sharing-folder-view')).toBeVisible();

    // Should see "Semua" tab
    await expect(page.locator('#tab-semua-btn')).toBeVisible();
  });
  
  test('Search and filter functionality', async ({ page }) => {
    const user = await injectAuth(page, 'staff', 'marketing');
    if (!user) return; // skipped
    
    await expect(page.locator('#app')).toBeVisible();
    await page.click('#tab-btn-files');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('btn-sharing-folder').click());
    
    // Type in search box
    await page.fill('#sharing-search', 'PO');
    // We expect the table to only show matches or be empty
    await page.waitForTimeout(500); // small wait for UI update
    
    const rows = await page.locator('#sharing-table-body tr').count();
    const emptyState = await page.locator('#sharing-empty').isVisible();
    
    expect(rows > 0 || emptyState).toBeTruthy();
  });

  test('Each document row has a Bagikan (share) button with a share link', async ({ page }) => {
    const user = await injectAuth(page, 'staff', 'marketing');
    if (!user) return; // skipped

    await expect(page.locator('#app')).toBeVisible();
    await page.click('#tab-btn-files');
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getElementById('btn-sharing-folder').click());
    await expect(page.locator('#sharing-folder-view')).toBeVisible();
    await page.waitForTimeout(1000);

    const rowCount = await page.locator('#sharing-table-body tr').count();
    if (rowCount === 0) {
      test.skip(true, 'No documents in sharing folder to verify share button');
      return;
    }

    const shareBtn = page.locator('#sharing-table-body tr').first().locator('button.share-btn');
    await expect(shareBtn).toBeVisible();

    // Capture the shared link
    let copiedLink = '';
    await page.evaluate(() => {
      window.__capturedLink = '';
      const orig = window.navigator.clipboard.writeText;
      window.navigator.clipboard.writeText = (t) => { window.__capturedLink = t; return Promise.resolve(); };
    });
    await shareBtn.click();

    await page.waitForFunction(() => window.__capturedLink !== '');
    const captured = await page.evaluate(() => window.__capturedLink);
    expect(captured).toMatch(/\/s\/[a-f0-9]+$/);

    // Verify the modal shows the link
    await expect(page.locator('.custom-dialog-modal')).toBeVisible();
    const dialogText = await page.locator('.custom-dialog-modal').textContent();
    expect(dialogText).toContain(captured);

    // Close the dialog
    await page.locator('.custom-dialog-modal .btn-primary-sm').click();
    await expect(page.locator('.custom-dialog-modal')).not.toBeVisible();
  });
});
