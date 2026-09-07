import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeeRow } from './EmployeeRow';
import { EmployeeTable } from './EmployeeTable';
import type { Employee } from '../../types/employee';

const mockEmployee: Employee = {
  id: 1,
  employee_code: 'EMP-00001',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@acme.corp',
  department: 'Engineering',
  job_title: 'Senior Software Engineer',
  country: 'United States',
  currency: 'USD',
  hire_date: '2021-03-15',
  created_at: '2021-03-15T00:00:00Z',
  updated_at: '2021-03-15T00:00:00Z',
  current_salary: {
    id: 101,
    employee_id: 1,
    amount: '145000.00',
    currency: 'USD',
    effective_date: '2023-01-01',
    change_reason: 'Annual Performance Merit Increase',
    created_at: '2023-01-01T00:00:00Z',
  },
};

describe('Employee Directory Components', () => {
  describe('EmployeeFilters', () => {
    it('renders search input, selects, and total records count', () => {
      render(
        <EmployeeFilters
          search=""
          department=""
          country=""
          totalCount={10000}
          onSearchChange={vi.fn()}
          onDepartmentChange={vi.fn()}
          onCountryChange={vi.fn()}
          onReset={vi.fn()}
        />
      );

      expect(screen.getByPlaceholderText(/search by name, email, code/i)).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
    });

    it('handles search input change and debounce', () => {
      const handleSearchChange = vi.fn();
      render(
        <EmployeeFilters
          search=""
          department=""
          country=""
          totalCount={500}
          onSearchChange={handleSearchChange}
          onDepartmentChange={vi.fn()}
          onCountryChange={vi.fn()}
          onReset={vi.fn()}
        />
      );

      const input = screen.getByPlaceholderText(/search by name, email, code/i);
      fireEvent.change(input, { target: { value: 'Alice' } });
      expect(input).toHaveValue('Alice');
    });

    it('calls onReset when Reset button is clicked', () => {
      const handleReset = vi.fn();
      render(
        <EmployeeFilters
          search="Alice"
          department="Engineering"
          country="United States"
          totalCount={12}
          onSearchChange={vi.fn()}
          onDepartmentChange={vi.fn()}
          onCountryChange={vi.fn()}
          onReset={handleReset}
        />
      );

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      expect(handleReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('EmployeeRow', () => {
    it('renders all employee data and formatted salary', () => {
      const handleClick = vi.fn();
      render(
        <table>
          <tbody>
            <EmployeeRow employee={mockEmployee} onClick={handleClick} />
          </tbody>
        </table>
      );

      expect(screen.getByText('EMP-00001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@acme.corp')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('$145,000.00')).toBeInTheDocument();

      const row = screen.getByRole('row');
      fireEvent.click(row);
      expect(handleClick).toHaveBeenCalledWith(mockEmployee);
    });
  });

  describe('EmployeeTable', () => {
    it('renders table headers and employee list', () => {
      const handleSelect = vi.fn();
      const handleSort = vi.fn();
      const handlePageChange = vi.fn();
      const handlePageSizeChange = vi.fn();

      render(
        <EmployeeTable
          employees={[mockEmployee]}
          totalCount={1}
          currentPage={1}
          pageSize={25}
          totalPages={1}
          sortBy="first_name"
          sortOrder="asc"
          onSort={handleSort}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onSelectEmployee={handleSelect}
        />
      );

      expect(screen.getByText('Employee ID')).toBeInTheDocument();
      expect(screen.getByText('Employee Name')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Job Title')).toBeInTheDocument();
      expect(screen.getByText('Country')).toBeInTheDocument();
      expect(screen.getByText('Current Salary')).toBeInTheDocument();
      expect(screen.getByText('EMP-00001')).toBeInTheDocument();
    });

    it('triggers onSort when sortable header is clicked', () => {
      const handleSort = vi.fn();
      render(
        <EmployeeTable
          employees={[mockEmployee]}
          totalCount={1}
          currentPage={1}
          pageSize={25}
          totalPages={1}
          sortBy="first_name"
          sortOrder="asc"
          onSort={handleSort}
          onPageChange={vi.fn()}
          onPageSizeChange={vi.fn()}
          onSelectEmployee={vi.fn()}
        />
      );

      const nameHeader = screen.getByText('Employee Name');
      fireEvent.click(nameHeader);
      expect(handleSort).toHaveBeenCalledWith('first_name');
    });
  });
});
