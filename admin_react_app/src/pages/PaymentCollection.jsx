import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import KPICard from '../components/common/KPICard';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import Input from '../components/forms/Input';
import Select from '../components/forms/Select';
import Modal from '../components/common/Modal'; // Import your Modal component
import paymentService from '../services/paymentService';
import { calculatePaymentKPIs, getPaymentAction, formatCurrency } from '../utils/helpers';

const PaymentCollection = () => {
  const { user } = useAuth();
  
  // State for payment data and KPIs
  const [paymentData, setPaymentData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [kpis, setKpis] = useState({
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // State for modal and selected payment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Status filter options
  const statusFilterOptions = [
    { value: '', label: 'All Status' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' }
  ];

  // Fetch payment data on component mount
  useEffect(() => {
    fetchPaymentData();
  }, [user]);

  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [paymentData, filters]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const sessionData = await paymentService.getPaymentData(user);
      const payments = paymentService.transformSessionsToPayments(sessionData);
      
      setPaymentData(payments);
      
      // Calculate KPIs using helper function
      const calculatedKpis = calculatePaymentKPIs(payments);
      setKpis(calculatedKpis);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...paymentData];

    // Search filter (vehicle or payment ID)
    if (filters.search) {
      filtered = filtered.filter(payment =>
        payment.vehicle_reg_no.toLowerCase().includes(filters.search.toLowerCase()) ||
        payment.payment_id.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(payment => payment.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate <= new Date(filters.dateTo);
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleExportCSV = () => {
    try {
      const dataToExport = filteredData.length > 0 ? filteredData : paymentData;
      paymentService.exportToCSV(dataToExport, 'payment_records.csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRefresh = () => {
    fetchPaymentData();
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Update your handlePaymentAction function with debug logs
  const handlePaymentAction = (payment, action) => {
    console.log('Payment action triggered:', action, 'for payment:', payment);
    
    if (action.type === 'view') {
      console.log('Opening modal for payment:', payment.payment_id);
      setSelectedPayment(payment);
      setIsModalOpen(true);
    } else if (action.type === 'collect') {
      console.log('Collect payment:', payment.payment_id);
      alert(`Collect payment for ${payment.vehicle_reg_no} - Amount: ${formatCurrency(payment.amount)}`);
    } else if (action.type === 'retry') {
      console.log('Retry payment:', payment.payment_id);
      alert(`Retry payment for ${payment.vehicle_reg_no}`);
    }
  };

  // Add debug to see modal state changes
  useEffect(() => {
    console.log('Modal state - isOpen:', isModalOpen, 'selectedPayment:', selectedPayment);
  }, [isModalOpen, selectedPayment]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayment(null);
  };

  const getActionButton = (payment) => {
    const action = getPaymentAction(payment.status);
    
    const colorClasses = {
      blue: 'text-blue-600 border-blue-600 hover:bg-blue-50',
      green: 'text-green-600 border-green-600 hover:bg-green-50',
      gray: 'text-white border-gray-600 hover:bg-gray-50'
    };

    return (
      <Button 
        variant={action.variant} 
        size="sm" 
        className={colorClasses[action.color] || colorClasses.gray}
        onClick={() => handlePaymentAction(payment, action)}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-purple-600 mb-2">Payment Collection</h1>
        <p className="text-gray-600">
          Manage payment records and collections for parking sessions
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Payments"
          value={kpis.totalPayments}
          loading={loading}
          error={error ? 'Failed to load' : null}
          className="border-l-4 border-l-blue-500"
        />
        <KPICard
          title="Completed"
          value={kpis.completedPayments}
          loading={loading}
          error={error ? 'Failed to load' : null}
          className="border-l-4 border-l-green-500"
        />
        <KPICard
          title="Pending"
          value={kpis.pendingPayments}
          loading={loading}
          error={error ? 'Failed to load' : null}
          className="border-l-4 border-l-orange-500"
        />
        <KPICard
          title="Failed"
          value={kpis.failedPayments}
          loading={loading}
          error={error ? 'Failed to load' : null}
          className="border-l-4 border-l-red-500"
        />
      </div>

      {/* Filter Section */}
      <div className="bg-white text-gray-950 rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Filter Payments</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <Input
            name="search"
            type="text"
            color="gray-500"
            label="Search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search by vehicle or session"
          />
          
          {/* Status Filter */}
          <Select
            name="status"
            label="Status Filter"
            value={filters.status}
            onChange={handleFilterChange}
            options={statusFilterOptions}
          />
          
          {/* Date From */}
          <Input
            name="dateFrom"
            type="date"
            label="Date From"
            value={filters.dateFrom}
            onChange={handleFilterChange}
          />
          
          {/* Date To */}
          <Input
            name="dateTo"
            type="date"
            label="Date To"
            value={filters.dateTo}
            onChange={handleFilterChange}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="primary"
              onClick={applyFilters}
              className="w-full sm:w-auto"
            >
              Apply Filters
            </Button>
            
            <Button
              variant="outline"
              onClick={clearFilters}
              className="w-full sm:w-auto text-white"
            >
              Clear Filters
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredData.length === 0 && paymentData.length === 0}
              className="w-full sm:w-auto text-white"
            >
              Export CSV
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              loading={loading}
              className="w-full sm:w-auto text-white"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Records Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg text-black font-semibold">Payment Records</h3>
          <div className="text-sm text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records
          </div>
        </div>

        {/* Payment Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPaymentData} variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      {filters.search || filters.status || filters.dateFrom || filters.dateTo
                        ? 'No payment records found matching your filters.'
                        : 'No payment records found.'}
                    </td>
                  </tr>
                ) : (
                  currentData.map((payment) => (
                    <tr key={payment.payment_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.payment_id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.vehicle_reg_no}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.duration}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        {getActionButton(payment)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className="w-8 h-8 p-0 text-white"
                    >
                      {page}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className=" text-white"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Payment ID</label>
                <p className="text-sm text-gray-900">{selectedPayment.payment_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vehicle</label>
                <p className="text-sm text-gray-900">{selectedPayment.vehicle_reg_no}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Amount</label>
                <p className="text-sm text-gray-900 font-semibold">{formatCurrency(selectedPayment.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <StatusBadge status={selectedPayment.status} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedPayment.date).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="text-sm text-gray-900">{selectedPayment.duration}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vehicle Type</label>
                <p className="text-sm text-gray-900 capitalize">{selectedPayment.vehicle_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Session ID</label>
                <p className="text-sm text-gray-900">{selectedPayment.session_id}</p>
              </div>
            </div>
            
            {selectedPayment.start_time && (
              <div>
                <label className="text-sm font-medium text-gray-500">Start Time</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedPayment.start_time).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            
            {selectedPayment.end_time && (
              <div>
                <label className="text-sm font-medium text-gray-500">End Time</label>
                <p className="text-sm text-gray-900">
                  {new Date(selectedPayment.end_time).toLocaleString('en-IN')}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              {selectedPayment.status === 'PENDING' && (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    closeModal();
                    handlePaymentAction(selectedPayment, { type: 'collect', label: 'Collect' });
                  }}
                >
                  Collect Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentCollection;