import BasePage from './BasePage.js';

class PaymentCollectionPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Header elements
    this.pageTitle = page.locator('h1:has-text("Payment Collection")');
    this.pageSubtitle = page.locator('text=Manage payment records and collections');
    
    // KPI Cards
    this.kpiSection = page.locator('h3:has-text("Total Payments")').locator('..').locator('..');
    this.totalPaymentsCard = page.locator('h3:has-text("Total Payments")').locator('..');
    this.completedPaymentsCard = page.locator('h3:has-text("Completed")').locator('..');
    this.pendingPaymentsCard = page.locator('h3:has-text("Pending")').locator('..');
    this.failedPaymentsCard = page.locator('h3:has-text("Failed")').locator('..');
    
    // Filter Section
    this.filterSection = page.locator('text=Filter Payments');
    this.searchInput = page.locator('input[name="search"]');
    this.statusSelect = page.locator('select[name="status"]');
    this.dateFromInput = page.locator('input[name="dateFrom"]');
    this.dateToInput = page.locator('input[name="dateTo"]');
    this.applyFiltersButton = page.locator('button:has-text("Apply Filters")');
    this.clearFiltersButton = page.locator('button:has-text("Clear Filters")');
    this.exportCSVButton = page.locator('button:has-text("Export CSV")');
    this.refreshButton = page.locator('button:has-text("Refresh")');
    
    // Payment Records Table
    this.paymentRecordsSection = page.locator('h3:has-text("Payment Records")');
    this.paymentTable = page.locator('table');
    this.paymentTableHeaders = page.locator('thead th');
    this.paymentTableRows = page.locator('tbody tr');
    this.paymentTableBody = page.locator('tbody');
    
    // Pagination
    this.paginationSection = page.locator('text=Page').locator('..');
    this.previousButton = page.locator('button:has-text("Previous")');
    this.nextButton = page.locator('button:has-text("Next")');
    this.pageNumbers = page.locator('button').filter({ hasText: /^[0-9]+$/ });
    
    // Loading and Error States
    this.loadingSpinner = page.locator('.animate-spin');
    this.errorMessage = page.locator('.text-red-600.mb-4');
    this.retryButton = page.locator('button:has-text("Retry")');
    this.emptyStateMessage = page.locator('td.text-gray-500').filter({ hasText: /No payment records found/ });
    
    // Modal
    this.modal = page.locator('[role="dialog"]');
    this.modalTitle = page.locator('#modal-title');
    this.modalCloseButton = page.locator('[role="dialog"] button:has-text("Close")');
    this.collectPaymentButton = page.locator('button:has-text("Collect Payment")');
    
    // Action Buttons
    this.viewButtons = page.locator('button:has-text("View")');
    this.collectButtons = page.locator('button:has-text("Collect")');
    this.retryButtons = page.locator('button:has-text("Retry")');
  }

  async navigateToPaymentCollection() {
    await this.navigateTo('/payment-collection');
    await this.waitForPageLoad();
  }

  async waitForPaymentCollectionLoad() {
    // Wait for either data to load or error to appear
    await Promise.race([
      this.page.waitForSelector('h3:has-text("Total Payments")', { timeout: 10000 }),
      this.page.waitForSelector('text=Failed to load', { timeout: 10000 }),
      this.page.waitForSelector('.animate-spin', { timeout: 10000 })
    ]);
  }

  async isPaymentCollectionLoaded() {
    return await this.pageTitle.isVisible();
  }

  async isDataLoaded() {
    return await this.page.locator('h3:has-text("Total Payments")').isVisible();
  }

  async isLoading() {
    return await this.loadingSpinner.first().isVisible();
  }

  async hasError() {
    return await this.errorMessage.isVisible();
  }

  // KPI Methods
  async getKPIValue(title) {
    const card = this.page.locator('h3:has-text("' + title + '")').locator('..');
    const valueElement = card.locator('p.text-2xl').first();
    const text = await valueElement.textContent();
    return text ? text.trim() : '0';
  }

  async getKPIValueAsNumber(title) {
    const value = await this.getKPIValue(title);
    // Remove commas and convert to number
    return Number(value.replace(/,/g, ''));
  }

  async getTotalPaymentsCount() {
    return await this.getKPIValue('Total Payments');
  }

  async getCompletedPaymentsCount() {
    return await this.getKPIValue('Completed');
  }

  async getPendingPaymentsCount() {
    return await this.getKPIValue('Pending');
  }

  async getFailedPaymentsCount() {
    return await this.getKPIValue('Failed');
  }

  // Filter Methods
  async setSearchFilter(searchTerm) {
    await this.searchInput.fill(searchTerm);
  }

  async setStatusFilter(status) {
    await this.statusSelect.selectOption(status);
  }

  async setDateFromFilter(date) {
    await this.dateFromInput.fill(date);
  }

  async setDateToFilter(date) {
    await this.dateToInput.fill(date);
  }

  async applyFilters() {
    await this.applyFiltersButton.click();
  }

  async clearFilters() {
    await this.clearFiltersButton.click();
  }

  async exportCSV() {
    await this.exportCSVButton.click();
  }

  async refreshData() {
    await this.refreshButton.click();
  }

  // Table Methods
  async getTableRowCount() {
    return await this.paymentTableRows.count();
  }

  async getTableHeaderText() {
    const headers = [];
    const count = await this.paymentTableHeaders.count();
    for (let i = 0; i < count; i++) {
      const text = await this.paymentTableHeaders.nth(i).textContent();
      headers.push(text.trim());
    }
    return headers;
  }

  async getPaymentRowData(rowIndex) {
    const row = this.paymentTableRows.nth(rowIndex);
    const cells = row.locator('td');
    
    return {
      paymentId: await cells.nth(0).textContent(),
      vehicle: await cells.nth(1).textContent(),
      amount: await cells.nth(2).textContent(),
      date: await cells.nth(3).textContent(),
      duration: await cells.nth(4).textContent(),
      status: await cells.nth(5).textContent(),
      actionButton: cells.nth(6).locator('button')
    };
  }

  async clickActionButton(rowIndex) {
    const rowData = await this.getPaymentRowData(rowIndex);
    await rowData.actionButton.click();
  }

  // Pagination Methods
  async getCurrentPageNumber() {
    const pageText = await this.paginationSection.locator('text=Page').textContent();
    const match = pageText.match(/Page (\d+) of/);
    return match ? parseInt(match[1]) : 1;
  }

  async getTotalPages() {
    const pageText = await this.paginationSection.locator('text=Page').textContent();
    const match = pageText.match(/Page \d+ of (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  async goToNextPage() {
    await this.nextButton.click();
  }

  async goToPreviousPage() {
    await this.previousButton.click();
  }

  async goToPage(pageNumber) {
    const pageButton = this.pageNumbers.filter({ hasText: pageNumber.toString() });
    await pageButton.click();
  }

  async isNextButtonEnabled() {
    return await this.nextButton.isEnabled();
  }

  async isPreviousButtonEnabled() {
    return await this.previousButton.isEnabled();
  }

  // Modal Methods
  async isModalOpen() {
    return await this.modal.isVisible();
  }

  async getModalTitle() {
    return await this.modalTitle.textContent();
  }

  async closeModal() {
    await this.modalCloseButton.click();
  }

  async collectPaymentFromModal() {
    await this.collectPaymentButton.click();
  }

  // Action Methods
  async clickViewButton(rowIndex) {
    const viewButton = this.viewButtons.nth(rowIndex);
    await viewButton.click();
  }

  async clickCollectButton(rowIndex) {
    const collectButton = this.collectButtons.nth(rowIndex);
    await collectButton.click();
  }

  async clickRetryButton(rowIndex) {
    const retryButton = this.retryButtons.nth(rowIndex);
    await retryButton.click();
  }

  // Utility Methods
  async waitForKPICards() {
    await this.page.waitForSelector('h3:has-text("Total Payments")', { timeout: 10000 });
  }

  async waitForTableData() {
    // Wait for either table data or empty state
    await Promise.race([
      this.page.waitForSelector('tbody tr', { timeout: 10000 }),
      this.page.waitForSelector('text=No payment records found', { timeout: 10000 }),
      this.page.waitForSelector('text=No payment records found matching your filters', { timeout: 10000 })
    ]);
  }

  async getRecordsCountText() {
    return await this.page.locator('text=Showing').first().textContent();
  }

  async isExportButtonEnabled() {
    return await this.exportCSVButton.isEnabled();
  }

  async isRefreshButtonLoading() {
    const button = this.refreshButton;
    return await button.locator('.animate-spin').isVisible();
  }
}

export default PaymentCollectionPage;
