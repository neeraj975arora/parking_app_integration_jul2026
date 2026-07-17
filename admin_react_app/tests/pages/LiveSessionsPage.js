import BasePage from './BasePage.js';

class LiveSessionsPage extends BasePage {
  // Page Elements
  get pageTitle() {
    return this.page.locator('h1:has-text("Live Sessions")');
  }

  get pageSubtitle() {
    return this.page.locator('text=Monitor active parking sessions in real-time');
  }

  get activeSessionIndicator() {
    return this.page.locator('.w-3.h-3.bg-green-500.rounded-full.animate-pulse');
  }

  get activeSessionText() {
    return this.page.locator('text=Active Session');
  }

  // Loading and Error States
  get loadingSpinner() {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  get errorMessage() {
    return this.page.locator('.bg-red-50.border.border-red-200');
  }

  get errorTitle() {
    return this.page.locator('text=Error Loading Live Sessions');
  }

  // KPI Cards
  get kpiCardsSection() {
    return this.page.locator('[data-testid="live-sessions-kpi-cards"]');
  }

  get activeParticipantsCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Active Participants")');
  }

  get totalRevenueCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Total Revenue")');
  }

  get avgSessionTimeCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Avg. Session Time")');
  }

  get occupancyRateCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Occupancy Rate")');
  }

  // Participants Section
  get participantsSection() {
    return this.page.locator('text=Current Participants').locator('..').locator('..');
  }

  get participantsTitle() {
    return this.page.locator('text=Current Participants');
  }

  get searchInput() {
    return this.page.locator('input[placeholder*="Search by vehicle ID or name"]');
  }

  get searchIcon() {
    return this.page.locator('svg').first();
  }

  get participantsList() {
    return this.page.locator('.space-y-3');
  }

  get noParticipantsMessage() {
    return this.page.locator('text=No active participants.');
  }

  get noSearchResultsMessage() {
    return this.page.locator('text=No participants found matching your search.');
  }

  // Participant Cards
  get participantCards() {
    return this.page.locator('.bg-gray-50.rounded-lg.hover\\:bg-gray-100');
  }

  get firstParticipantCard() {
    return this.participantCards.first();
  }

  get participantAvatar() {
    return this.page.locator('.w-10.h-10.rounded-full.flex.items-center.justify-center.text-white');
  }

  get participantName() {
    return this.page.locator('.font-medium.text-gray-900');
  }

  get participantDetails() {
    return this.page.locator('.text-sm.text-gray-600');
  }

  get checkoutButton() {
    return this.page.locator('button[title="Check Out Vehicle"]');
  }

  get warningIcon() {
    return this.page.locator('.w-6.h-6.bg-yellow-100.rounded-full');
  }

  // Checkout Modal
  get checkoutModal() {
    return this.page.locator('[role="dialog"]:has-text("Check Out Vehicle")');
  }

  get checkoutModalTitle() {
    return this.page.locator('[role="dialog"] h2, [role="dialog"] h3');
  }

  get checkoutModalCloseButton() {
    return this.page.locator('[role="dialog"] button:has-text("Cancel")');
  }

  get checkoutModalConfirmButton() {
    return this.page.locator('[role="dialog"] button:has-text("Check Out")');
  }

  get paymentMethodSelect() {
    return this.page.locator('select');
  }

  get paymentMethodOptions() {
    return this.page.locator('select option');
  }

  get checkoutWarningIcon() {
    return this.page.locator('.mx-auto.flex.items-center.justify-center.h-12.w-12.rounded-full.bg-yellow-100');
  }

  get checkoutMessage() {
    return this.page.locator('text=Are you sure you want to check out');
  }

  // Session Timer
  get sessionTimer() {
    return this.page.locator('.text-3xl.font-mono.font-bold.text-gray-900');
  }

  get sessionTimerLabel() {
    return this.page.locator('text=Session Duration');
  }

  // Activity Feed
  get activityFeed() {
    return this.page.locator('text=Recent Activity').locator('..').locator('..');
  }

  get activityFeedTitle() {
    return this.page.locator('text=Recent Activity');
  }

  get activityLiveIndicator() {
    return this.page.locator('.w-2.h-2.bg-green-500.rounded-full.animate-pulse');
  }

  get activityLiveText() {
    return this.page.locator('.text-xs.text-green-600:has-text("Live")');
  }

  get activityItems() {
    return this.page.locator('.space-y-4 .flex.items-start.space-x-3');
  }

  get firstActivityItem() {
    return this.activityItems.first();
  }

  get activityIcon() {
    return this.page.locator('.w-8.h-8.rounded-full.flex.items-center.justify-center');
  }

  get activityMessage() {
    return this.page.locator('.text-sm.text-gray-900.break-words');
  }

  get activityTime() {
    return this.page.locator('.text-xs.text-gray-500');
  }

  get noActivityMessage() {
    return this.page.locator('text=No recent activity');
  }

  // Navigation
  async navigateToLiveSessions() {
    await this.navigateTo('/live-sessions');
    await this.waitForPageLoad();
  }

  async waitForLiveSessionsLoad() {
    await this.waitForElement('h1:has-text("Live Sessions")', 15000);
  }

  async waitForKPICards() {
    await this.page.locator('[data-testid="kpi-card"]').first().waitFor({ timeout: 15000 });
  }

  async waitForParticipants() {
    await this.participantsSection.waitFor({ timeout: 10000 });
  }

  async waitForActivityFeed() {
    await this.activityFeed.waitFor({ timeout: 10000 });
  }

  // KPI Card Methods
  async getKPIValue(title) {
    const card = this.page.locator(`[data-testid="kpi-card"]:has-text("${title}")`);
    const valueElement = card.locator('[data-testid="kpi-value"]');
    return await valueElement.textContent();
  }

  async getKPISubtitle(title) {
    const card = this.page.locator(`[data-testid="kpi-card"]:has-text("${title}")`);
    const subtitleElement = card.locator('[data-testid="kpi-subtitle"]');
    return await subtitleElement.textContent();
  }

  // Search Methods
  async searchParticipants(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounced search
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async getSearchPlaceholder() {
    return await this.searchInput.getAttribute('placeholder');
  }

  // Participant Methods
  async getParticipantCount() {
    const count = await this.participantCards.count();
    return count;
  }

  async getParticipantNames() {
    const names = await this.participantName.allTextContents();
    return names;
  }

  async getParticipantDetails() {
    const details = await this.participantDetails.allTextContents();
    return details;
  }

  async getFirstParticipantInfo() {
    const name = await this.participantName.first().textContent();
    const details = await this.participantDetails.first().textContent();
    return { name: name.trim(), details: details.trim() };
  }

  async clickFirstCheckoutButton() {
    await this.checkoutButton.first().click();
  }

  async isWarningIconVisible() {
    return await this.warningIcon.isVisible();
  }

  // Checkout Modal Methods
  async openCheckoutModal() {
    await this.clickFirstCheckoutButton();
    await this.checkoutModal.waitFor({ timeout: 5000 });
  }

  async closeCheckoutModal() {
    await this.checkoutModalCloseButton.click();
    await this.page.waitForTimeout(500);
  }

  async selectPaymentMethod(method) {
    await this.paymentMethodSelect.selectOption(method);
  }

  async getSelectedPaymentMethod() {
    return await this.paymentMethodSelect.inputValue();
  }

  async confirmCheckout() {
    await this.checkoutModalConfirmButton.click();
  }

  async getCheckoutModalTitle() {
    return await this.checkoutModalTitle.textContent();
  }

  async getCheckoutMessage() {
    return await this.checkoutMessage.textContent();
  }

  async isCheckoutModalOpen() {
    return await this.checkoutModal.isVisible();
  }

  async isCheckoutButtonLoading() {
    const button = this.checkoutModalConfirmButton;
    const isLoading = await button.getAttribute('disabled');
    const hasLoadingText = await button.textContent();
    return isLoading === '' || hasLoadingText.includes('Checking Out');
  }

  // Session Timer Methods
  async getSessionTimer() {
    return await this.sessionTimer.textContent();
  }

  async getSessionTimerLabel() {
    return await this.sessionTimerLabel.textContent();
  }

  async isSessionTimerRunning() {
    const timer = await this.getSessionTimer();
    return timer && timer.match(/^\d{2}:\d{2}:\d{2}$/) !== null;
  }

  // Activity Feed Methods
  async getActivityCount() {
    const count = await this.activityItems.count();
    return count;
  }

  async getActivityMessages() {
    const messages = await this.activityMessage.allTextContents();
    return messages;
  }

  async getFirstActivityMessage() {
    return await this.activityMessage.first().textContent();
  }

  async getFirstActivityTime() {
    return await this.activityTime.first().textContent();
  }

  async isActivityLive() {
    return await this.activityLiveIndicator.isVisible();
  }

  async getActivityLiveText() {
    return await this.activityLiveText.textContent();
  }

  // Loading and Error Methods
  async isLoading() {
    return await this.loadingSpinner.first().isVisible();
  }

  async hasError() {
    return await this.errorMessage.isVisible();
  }

  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }

  async getErrorTitle() {
    return await this.errorTitle.textContent();
  }

  // Utility Methods
  async refreshPage() {
    await this.page.reload();
    await this.waitForLiveSessionsLoad();
  }

  async waitForDataLoad() {
    // Wait for either KPI cards or error state
    try {
      await this.waitForKPICards();
    } catch (error) {
      // If KPI cards don't load, check for error state
      await this.page.waitForTimeout(2000);
    }
  }

  // Complete Workflow Methods
  async completeCheckoutWorkflow(paymentMethod = 'digital') {
    // Open modal
    await this.openCheckoutModal();
    
    // Select payment method
    await this.selectPaymentMethod(paymentMethod);
    
    // Confirm checkout
    await this.confirmCheckout();
    
    // Wait for modal to close
    await this.page.waitForTimeout(2000);
  }

  async cancelCheckoutWorkflow() {
    // Open modal
    await this.openCheckoutModal();
    
    // Close modal
    await this.closeCheckoutModal();
  }

  // Search and Filter Methods
  async searchAndVerifyResults(searchTerm) {
    await this.searchParticipants(searchTerm);
    
    const participantCount = await this.getParticipantCount();
    const participantNames = await this.getParticipantNames();
    
    return {
      count: participantCount,
      names: participantNames,
      hasResults: participantCount > 0
    };
  }

  // Validation Methods
  async validateParticipantCard(participantIndex = 0) {
    const card = this.participantCards.nth(participantIndex);
    const avatar = card.locator('.w-10.h-10.rounded-full');
    const name = card.locator('.font-medium.text-gray-900');
    const details = card.locator('.text-sm.text-gray-600');
    const checkoutBtn = card.locator('button[title="Check Out Vehicle"]');
    
    return {
      hasAvatar: await avatar.isVisible(),
      hasName: await name.isVisible(),
      hasDetails: await details.isVisible(),
      hasCheckoutButton: await checkoutBtn.isVisible()
    };
  }

  async validateActivityFeed() {
    const hasTitle = await this.activityFeedTitle.isVisible();
    const hasLiveIndicator = await this.isActivityLive();
    const activityCount = await this.getActivityCount();
    
    return {
      hasTitle,
      hasLiveIndicator,
      activityCount,
      hasActivities: activityCount > 0
    };
  }
}

export default LiveSessionsPage;
