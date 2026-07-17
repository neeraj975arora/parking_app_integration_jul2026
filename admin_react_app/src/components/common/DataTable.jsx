import React, { useState, useMemo, useCallback } from "react";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import ErrorDisplay from "./ErrorDisplay";

const DataTable = React.memo(({
  columns = [],
  data = [],
  loading = false,
  error = null,
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  emptyState,
  onSort,
  onFilter,
  onRowClick,
  className = "",
  striped = false,
  hoverable = true,
  compact = false,
  ...props
}) => {
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  // Handle sorting with useCallback for performance
  const handleSort = useCallback((columnKey) => {
    if (!sortable) return;

    let newDirection = "asc";
    if (sortColumn === columnKey && sortDirection === "asc") {
      newDirection = "desc";
    }

    setSortColumn(columnKey);
    setSortDirection(newDirection);

    if (onSort) {
      onSort(columnKey, newDirection);
    }
  }, [sortable, sortColumn, sortDirection, onSort]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || onSort) return data; // If external sorting, don't sort here

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, onSort]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!filterable || Object.keys(filters).length === 0) return sortedData;

    return sortedData.filter((row) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = row[key]?.toString().toLowerCase() || "";
        return cellValue.includes(value.toLowerCase());
      });
    });
  }, [sortedData, filters, filterable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-4 h-4 text-blue-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  const handleFilterChange = useCallback((columnKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [columnKey]: value,
    }));
    setCurrentPage(1); // Reset to first page when filtering

    if (onFilter) {
      onFilter({ ...filters, [columnKey]: value });
    }
  }, [onFilter, filters]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        type="generic"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    if (emptyState) {
      return emptyState;
    }

    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 text-gray-400 mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-500 text-lg">No data available</p>
      </div>
    );
  }

  return (
    <div className={`${className}`} {...props}>
      {/* Filters */}
      {filterable && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {columns
            .filter((col) => col.filterable)
            .map((column) => (
              <div key={column.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter {column.label}
                </label>
                <input
                  type="text"
                  placeholder={`Filter by ${column.label.toLowerCase()}`}
                  value={filters[column.key] || ""}
                  onChange={(e) =>
                    handleFilterChange(column.key, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className={compact ? "bg-gray-50" : "bg-gray-50"}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`
                    ${
                      compact ? "px-3 py-2" : "px-6 py-3"
                    } text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                    ${
                      column.sortable !== false && sortable
                        ? "cursor-pointer hover:bg-gray-100 select-none"
                        : ""
                    }
                  `}
                  onClick={
                    column.sortable !== false
                      ? () => handleSort(column.key)
                      : undefined
                  }
                  style={{ width: column.width }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable !== false &&
                      sortable &&
                      getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={`bg-white divide-y divide-gray-200 ${
              striped ? "divide-y-0" : ""
            }`}
          >
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`
                  ${striped && rowIndex % 2 === 1 ? "bg-gray-50" : ""}
                  ${hoverable ? "hover:bg-gray-50" : ""}
                  ${onRowClick ? "cursor-pointer" : ""}
                  transition-colors duration-150
                `}
                onClick={
                  onRowClick ? () => onRowClick(row, rowIndex) : undefined
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      ${
                        compact ? "px-3 py-2" : "px-6 py-4"
                      } whitespace-nowrap text-sm text-gray-900
                      ${
                        column.align === "center"
                          ? "text-center"
                          : column.align === "right"
                          ? "text-right"
                          : "text-left"
                      }
                    `}
                  >
                    {column.render
                      ? column.render(row[column.key], row, rowIndex)
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
            {filteredData.length} results
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              const isCurrentPage = page === currentPage;

              // Show first page, last page, current page, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                );
              }

              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-gray-500">
                    ...
                  </span>
                );
              }

              return null;
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default DataTable;
