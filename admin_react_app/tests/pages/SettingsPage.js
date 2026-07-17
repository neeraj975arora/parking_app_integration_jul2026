import BasePage from './BasePage.js';

class SettingsPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page elements
    this.pageTitle = page.locator('h1:has-text("Settings")');
    this.breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    this.adminUserInfo = page.locator('text=Admin User');
    this.adminAvatar = page.locator('.w-8.h-8.bg-purple-600.rounded-full');
    
    // Notification Settings Card
    this.notificationCard = page.locator('.bg-white.rounded-lg.shadow-sm').first();
    this.notificationCardTitle = page.locator('h3:has-text("Notification Settings")');
    this.emailNotificationsToggle = page.locator('#emailNotifications');
    this.pushAlertsToggle = page.locator('#pushAlerts');
    
    // Account Settings Card
    this.accountCard = page.locator('.bg-white.rounded-lg.shadow-sm').nth(1);
    this.accountCardTitle = page.locator('h3:has-text("Account Settings")');
    this.adminEmailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    this.adminEmailLabel = page.locator('label:has-text("Admin Email")');
    this.passwordLabel = page.locator('label:has-text("Change Password")');
    
    // System Settings Card
    this.systemCard = page.locator('.bg-white.rounded-lg.shadow-sm').last();
    this.systemCardTitle = page.locator('h3:has-text("System Settings")');
    this.autoBackupToggle = page.locator('#autoBackup');
    this.maintenanceModeToggle = page.locator('#maintenanceMode');
    
    // Action Section
    this.saveButton = page.locator('button:has-text("Save All Settings")');
    this.saveButtonLoading = page.locator('button:has-text("Saving...")');
    this.successMessage = page.locator('p:has-text("Settings saved successfully!")');
    this.lastUpdatedMessage = page.locator('text=Last updated:');
    
    // Error elements
    this.emailError = page.locator('p[role="alert"]').first();
    this.passwordError = page.locator('p[role="alert"]').last();
    
    // Toggle switch elements (for checking state)
    this.toggleSwitches = page.locator('[role="switch"]');
  }

  async navigateToSettings() {
    await this.navigateTo('/settings');
    await this.waitForPageLoad();
  }

  async waitForSettingsPageLoad() {
    await this.waitForElement('h1:has-text("Settings")');
    await this.waitForElement('h3:has-text("Notification Settings")');
  }

  // Toggle Methods
  async toggleEmailNotifications() {
    await this.emailNotificationsToggle.click();
  }

  async togglePushAlerts() {
    await this.pushAlertsToggle.click();
  }

  async toggleAutoBackup() {
    await this.autoBackupToggle.click();
  }

  async toggleMaintenanceMode() {
    await this.maintenanceModeToggle.click();
  }

  // Input Methods
  async updateAdminEmail(email) {
    await this.adminEmailInput.clear();
    await this.adminEmailInput.fill(email);
  }

  async updatePassword(password) {
    await this.passwordInput.clear();
    await this.passwordInput.fill(password);
  }

  // Form Actions
  async saveSettings() {
    await this.saveButton.click();
  }

  async waitForSaveSuccess() {
    await this.waitForElement('text=Settings saved successfully!');
  }

  async waitForSaveLoading() {
    await this.waitForElement('button:has-text("Saving...")');
  }

  async waitForSaveComplete() {
    await this.page.waitForFunction(() => {
      const successMsg = document.querySelector('p');
      return !successMsg || !successMsg.textContent.includes('Settings saved successfully!');
    });
  }

  // Validation Methods
  async isEmailNotificationsEnabled() {
    return await this.emailNotificationsToggle.isChecked();
  }

  async isPushAlertsEnabled() {
    return await this.pushAlertsToggle.isChecked();
  }

  async isAutoBackupEnabled() {
    return await this.autoBackupToggle.isChecked();
  }

  async isMaintenanceModeEnabled() {
    return await this.maintenanceModeToggle.isChecked();
  }

  async getAdminEmailValue() {
    return await this.adminEmailInput.inputValue();
  }

  async getPasswordValue() {
    return await this.passwordInput.inputValue();
  }

  async getEmailError() {
    return await this.emailError.textContent();
  }

  async getPasswordError() {
    return await this.passwordError.textContent();
  }

  async isSaveButtonDisabled() {
    return await this.saveButton.isDisabled();
  }

  async isSaveButtonLoading() {
    return await this.saveButtonLoading.isVisible();
  }

  async isSuccessMessageVisible() {
    return await this.successMessage.isVisible();
  }

  async getSuccessMessage() {
    return await this.successMessage.textContent();
  }

  async getLastUpdatedMessage() {
    return await this.lastUpdatedMessage.textContent();
  }

  // Form State Methods
  async clearAllInputs() {
    await this.adminEmailInput.clear();
    await this.passwordInput.clear();
  }

  async resetAllToggles() {
    // Reset toggles to default state
    if (await this.isEmailNotificationsEnabled()) {
      await this.toggleEmailNotifications();
    }
    if (await this.isPushAlertsEnabled()) {
      await this.togglePushAlerts();
    }
    if (!await this.isAutoBackupEnabled()) {
      await this.toggleAutoBackup();
    }
    if (await this.isMaintenanceModeEnabled()) {
      await this.toggleMaintenanceMode();
    }
  }

  async setDefaultSettings() {
    await this.updateAdminEmail('admin@parkingapp.com');
    await this.updatePassword('');
    await this.resetAllToggles();
  }

  // Navigation Methods
  async navigateToDashboard() {
    await this.clickElement('a[href="/dashboard"]');
  }

  async navigateViaBreadcrumb() {
    await this.clickElement('a[href="/dashboard"]');
  }

  // Accessibility Methods
  async getToggleAriaLabel(toggleId) {
    return await this.page.locator(`#${toggleId}`).getAttribute('aria-label');
  }

  async getInputAriaLabel(inputType) {
    const input = inputType === 'email' ? this.adminEmailInput : this.passwordInput;
    return await input.getAttribute('aria-label');
  }

  // Card Visibility Methods
  async isNotificationCardVisible() {
    return await this.notificationCard.isVisible();
  }

  async isAccountCardVisible() {
    return await this.accountCard.isVisible();
  }

  async isSystemCardVisible() {
    return await this.systemCard.isVisible();
  }

  // Icon Methods
  async getNotificationIcon() {
    return await this.notificationCard.locator('svg').first();
  }

  async getAccountIcon() {
    return await this.accountCard.locator('svg').first();
  }

  async getSystemIcon() {
    return await this.systemCard.locator('svg').first();
  }

  // Wait Methods
  async waitForErrorToAppear(field) {
    const errorSelector = field === 'email' ? 'p[role="alert"]' : 'p[role="alert"]';
    await this.waitForElement(errorSelector);
  }

  async waitForErrorToDisappear(field) {
    const errorSelector = field === 'email' ? 'p[role="alert"]' : 'p[role="alert"]';
    await this.page.waitForFunction((selector) => {
      const element = document.querySelector(selector);
      return !element || element.style.display === 'none';
    }, errorSelector);
  }

  // Local Storage Methods
  async getSettingsFromStorage() {
    return await this.page.evaluate(() => {
      return JSON.parse(localStorage.getItem('adminSettings') || '{}');
    });
  }

  async clearSettingsFromStorage() {
    await this.page.evaluate(() => {
      localStorage.removeItem('adminSettings');
    });
  }

  // Form Validation Helper
  async triggerValidation() {
    await this.saveButton.click();
  }

  async isFormValid() {
    const emailError = await this.emailError.isVisible();
    const passwordError = await this.passwordError.isVisible();
    return !emailError && !passwordError;
  }
}

export default SettingsPage;
