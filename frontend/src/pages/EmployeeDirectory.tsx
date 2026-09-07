import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import type { Employee, EmployeeFilterParams } from '../types/employee';
import { apiService } from '../services/api.service';
import { EmployeeFilters } from '../components/employees/EmployeeFilters';
import { EmployeeTable } from '../components/employees/EmployeeTable';
import { SalaryHistoryModal } from '../components/employees/SalaryHistoryModal';
import { AddEmployeeModal } from '../components/employees/AddEmployeeModal';
import { EditEmployeeModal } from '../components/employees/EditEmployeeModal';
import { DeleteEmployeeDialog } from '../components/employees/DeleteEmployeeDialog';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';

interface EmployeeDirectoryProps {
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

export const EmployeeDirectory: React.FC<EmployeeDirectoryProps> = ({
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [country, setCountry] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: EmployeeFilterParams = {
      page: currentPage,
      page_size: pageSize,
      search: search || undefined,
      department: department || undefined,
      country: country || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    };

    try {
      const resp = await apiService.employee.list(params);
      setEmployees(resp.items);
      setTotalCount(resp.total);
      setTotalPages(resp.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve employee directory');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, department, country, sortBy, sortOrder]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    setCurrentPage(1);
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('');
    setCountry('');
    setCurrentPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <Box>
      <EmployeeFilters
        search={search}
        department={department}
        country={country}
        totalCount={totalCount}
        onSearchChange={handleSearchChange}
        onDepartmentChange={handleDepartmentChange}
        onCountryChange={handleCountryChange}
        onReset={handleResetFilters}
      />

      {loading ? (
        <LoadingState message="Loading employee directory..." minHeight={300} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEmployees} />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description="Try broadening your search query or clearing your filter criteria."
          actionLabel="Clear Filters"
          onAction={handleResetFilters}
        />
      ) : (
        <EmployeeTable
          employees={employees}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          onSelectEmployee={setSelectedEmployee}
          onEditEmployee={setEditingEmployee}
          onDeleteEmployee={setDeletingEmployee}
        />
      )}

      <SalaryHistoryModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onSalaryAdded={fetchEmployees}
      />

      <EditEmployeeModal
        employee={editingEmployee}
        onClose={() => setEditingEmployee(null)}
        onEmployeeUpdated={fetchEmployees}
      />

      <DeleteEmployeeDialog
        employee={deletingEmployee}
        onClose={() => setDeletingEmployee(null)}
        onEmployeeDeleted={fetchEmployees}
      />

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeCreated={() => {
          fetchEmployees();
        }}
      />
    </Box>
  );
};
