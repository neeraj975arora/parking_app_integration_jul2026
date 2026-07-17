import BasePage from './BasePage.js';

class DailyClosurePage extends BasePage {
  // Page Elements
  get pageTitle() {
    return this.page.locator('h1:has-text("Daily Closure")');
  }

  get dateDisplay() {
    return this.page.locator('p.text-gray-600').first();
  }

  get statusIndicator() {
    return this.page.locator('span.inline-flex.px-4.py-2.rounded-full');
  }

  get mockDataWarning() {
    return this.page.locator('.bg-yellow-50.border-l-4.border-yellow-400');
  }

  get mockDataWarningText() {
    return this.page.locator('text=Demo Mode: Using mock data as the API is not available.');
  }

  // Loading and Error States
  get loadingSpinner() {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  get errorMessage() {
    return this.page.locator('.text-red-600');
  }

  get retryButton() {
    return this.page.locator('button:has-text("Retry")');
  }

  // KPI Cards
  get kpiCardsSection() {
    return this.page.locator('[data-testid="daily-closure-kpi-cards"]');
  }

  get outstandingAmountCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Outstanding Amount")');
  }

  get todayCollectionCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Today\'s Collection")');
  }

  get totalDueCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Total Due")');
  }

  get amountPaidCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("Amount Paid")');
  }

  get newOutstandingCard() {
    return this.page.locator('[data-testid="kpi-card"]:has-text("New Outstanding")');
  }

  // Action Button
  get finalizeButton() {
    return this.page.locator('button:has-text("Finalize Closure")');
  }

  get completedButton() {
    return this.page.locator('button:has-text("Closure Completed")');
  }

  get finalizedAtText() {
    return this.page.locator('text=Finalized on');
  }

  // Modal Elements
  get modal() {
    return this.page.locator('[role="dialog"]:has-text("Finalize Daily Closure")');
  }

  get modalTitle() {
    return this.page.locator('[role="dialog"] h2, [role="dialog"] h3');
  }

  get modalCloseButton() {
    return this.page.locator('[role="dialog"] button:has-text("Cancel")');
  }

  get modalConfirmButton() {
    return this.page.locator('[role="dialog"] button:has-text("Confirm Closure")');
  }

  get modalFinalizingButton() {
    return this.page.locator('[role="dialog"] button:has-text("Finalizing...")');
  }

  // Modal Content
  get closureSummarySection() {
    return this.page.locator('.bg-gray-50.p-4.rounded-lg');
  }

  get outstandingAmountSummary() {
    return this.page.locator('text=Outstanding Amount:').locator('..');
  }

  get todayCollectionSummary() {
    return this.page.locator('text=Today\'s Collection:').locator('..');
  }

  get totalDueSummary() {
    return this.page.locator('text=Total Due:').locator('..');
  }

  get paymentAmountInput() {
    return this.page.locator('input[type="number"]');
  }

  get paymentAmountLabel() {
    return this.page.locator('label:has-text("Payment Amount")');
  }

  get paymentAmountError() {
    return this.page.locator('.text-red-600');
  }

  get paymentAmountHelperText() {
    return this.page.locator('text=Enter the amount you are settling today');
  }

  get paymentSummarySection() {
    return this.page.locator('.bg-blue-50.p-3.rounded-lg');
  }

  get paymentSummaryTitle() {
    return this.page.locator('text=Payment Summary');
  }

  get totalDueInSummary() {
    return this.page.locator('text=Total Due:').locator('..').locator('span').last();
  }

  get paymentAmountInSummary() {
    return this.page.locator('text=Payment Amount:').locator('..').locator('span').last();
  }

  get newOutstandingInSummary() {
    return this.page.locator('text=New Outstanding:').locator('..').locator('span').last();
  }

  // Navigation
  async navigateToDailyClosure() {
    await this.navigateTo('/daily-closure');
    await this.waitForPageLoad();
  }

  async waitForDailyClosureLoad() {
    await this.waitForElement('h1:has-text("Daily Closure")', 15000);
  }

  async waitForKPICards() {
    await this.page.locator('[data-testid="kpi-card"]').first().waitFor({ timeout: 15000 });
  }

  async waitForModal() {
    await this.modal.waitFor({ timeout: 5000 });
  }

  async isModalOpen() {
    return await this.modal.isVisible();
  }

  // KPI Card Methods
  async getKPIValue(title) {
    const card = this.page.locator(`[data-testid="kpi-card"]:has-text("${title}")`);
    const valueElement = card.locator('[data-testid="kpi-value"]');
    return await valueElement.textContent();
  }

  async getKPIDescription(title) {
    const card = this.page.locator(`[data-testid="kpi-card"]:has-text("${title}")`);
    const descriptionElement = card.locator('[data-testid="kpi-subtitle"]');
    return await descriptionElement.textContent();
  }

  // Modal Methods
  async openFinalizeModal() {
    await this.finalizeButton.click();
    await this.waitForModal();
  }

  async closeModal() {
    await this.modalCloseButton.click();
    await this.page.waitForTimeout(500); // Wait for modal to close
  }

  async fillPaymentAmount(amount) {
    await this.paymentAmountInput.fill(amount.toString());
    await this.page.waitForTimeout(300); // Wait for validation
  }

  async clearPaymentAmount() {
    await this.paymentAmountInput.clear();
    await this.page.waitForTimeout(300);
  }

  async confirmClosure() {
    await this.modalConfirmButton.click();
  }

  async getModalTitle() {
    return await this.modalTitle.textContent();
  }

  async getClosureSummaryData() {
    const outstandingAmount = await this.outstandingAmountSummary.locator('span').last().textContent();
    const todayCollection = await this.todayCollectionSummary.locator('span').last().textContent();
    const totalDue = await this.totalDueSummary.locator('span').last().textContent();
    
    return {
      outstandingAmount: outstandingAmount.trim(),
      todayCollection: todayCollection.trim(),
      totalDue: totalDue.trim()
    };
  }

  async getPaymentSummaryData() {
    if (!(await this.paymentSummarySection.isVisible())) {
      return null;
    }

    const totalDue = await this.totalDueInSummary.textContent();
    const paymentAmount = await this.paymentAmountInSummary.textContent();
    const newOutstanding = await this.newOutstandingInSummary.textContent();
    
    return {
      totalDue: totalDue.trim(),
      paymentAmount: paymentAmount.trim(),
      newOutstanding: newOutstanding.trim()
    };
  }

  // Status Methods
  async getStatusText() {
    return await this.statusIndicator.textContent();
  }

  async getStatusClass() {
    return await this.statusIndicator.getAttribute('class');
  }

  async isStatusCompleted() {
    const statusText = await this.getStatusText();
    return statusText.toLowerCase().includes('completed');
  }

  async isStatusPending() {
    const statusText = await this.getStatusText();
    return statusText.toLowerCase().includes('pending');
  }

  // Button State Methods
  async isFinalizeButtonEnabled() {
    return await this.finalizeButton.isEnabled();
  }

  async isFinalizeButtonDisabled() {
    return await this.finalizeButton.isDisabled();
  }

  async isCompletedButtonVisible() {
    return await this.completedButton.isVisible();
  }

  async isFinalizedAtVisible() {
    return await this.finalizedAtText.isVisible();
  }

  // Loading and Error Methods
  async isLoading() {
    return await this.loadingSpinner.first().isVisible();
  }

  async hasError() {
    return await this.errorMessage.first().isVisible();
  }

  async getErrorMessage() {
    return await this.errorMessage.first().textContent();
  }

  async clickRetry() {
    await this.retryButton.click();
  }

  // Validation Methods
  async hasPaymentAmountError() {
    return await this.paymentAmountError.isVisible();
  }

  async getPaymentAmountErrorText() {
    return await this.paymentAmountError.textContent();
  }

  async isPaymentAmountValid() {
    const hasError = await this.hasPaymentAmountError();
    const isDisabled = await this.modalConfirmButton.isDisabled();
    return !hasError && !isDisabled;
  }

  // Mock Data Methods
  async isMockDataWarningVisible() {
    return await this.mockDataWarning.isVisible();
  }

  async getMockDataWarningText() {
    return await this.mockDataWarningText.textContent();
  }

  // Utility Methods
  async refreshPage() {
    await this.page.reload();
    await this.waitForDailyClosureLoad();
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

  async getCurrentDate() {
    const dateText = await this.dateDisplay.textContent();
    return dateText.trim();
  }

  // Form Validation Methods
  async validatePaymentAmount(amount) {
    await this.fillPaymentAmount(amount);
    await this.page.waitForTimeout(500);
    
    const hasError = await this.hasPaymentAmountError();
    const isConfirmEnabled = await this.modalConfirmButton.isEnabled();
    
    return {
      isValid: !hasError && isConfirmEnabled,
      hasError: hasError,
      errorText: hasError ? await this.getPaymentAmountErrorText() : null
    };
  }

  // Complete Workflow Methods
  async completeClosureWorkflow(paymentAmount) {
    // Open modal
    await this.openFinalizeModal();
    
    // Fill payment amount
    await this.fillPaymentAmount(paymentAmount);
    
    // Wait for payment summary to appear
    if (paymentAmount > 0) {
      await this.paymentSummarySection.waitFor({ timeout: 5000 });
    }
    
    // Confirm closure
    await this.confirmClosure();
    
    // Wait for modal to close
    await this.page.waitForTimeout(2000);
  }

  async cancelClosureWorkflow() {
    // Open modal
    await this.openFinalizeModal();
    
    // Close modal
    await this.closeModal();
  }
}

export default DailyClosurePage;
