import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalaryHistoryModal } from './SalaryHistoryModal';
import { AddEmployeeModal } from './AddEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';
import { apiService } from '../../services/api.service';
import type { Employee } from '../../types/employee';
import type { Salary } from '../../types/salary';

const mockEmployee: Employee = {
  id: 1,
  employee_code: 'EMP-00001',
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane.smith@acme.corp',
  department: 'Product',
  job_title: 'Lead Product Manager',
  country: 'United States',
  currency: 'USD',
  hire_date: '2021-01-10',
  created_at: '2021-01-10T00:00:00Z',
  updated_at: '2021-01-10T00:00:00Z',
  current_salary: {
    id: 201,
    employee_id: 1,
    amount: '160000.00',
    currency: 'USD',
    effective_date: '2024-01-01',
    change_reason: 'Promotion',
    created_at: '2024-01-01T00:00:00Z',
  },
};

const mockSalaries: Salary[] = [
  {
    id: 202,
    employee_id: 1,
    amount: '160000.00',
    currency: 'USD',
    effective_date: '2024-01-01',
    change_reason: 'Promotion',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 201,
    employee_id: 1,
    amount: '140000.00',
    currency: 'USD',
    effective_date: '2022-01-01',
    change_reason: 'Annual Merit Increment',
    created_at: '2022-01-01T00:00:00Z',
  },
];

describe('Employee Modals', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('SalaryHistoryModal', () => {
    it('does not render when employee is null', () => {
      const { container } = render(
        <SalaryHistoryModal employee={null} onClose={vi.fn()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders employee details and loads salary timeline history', async () => {
      vi.spyOn(apiService.salary, 'getHistory').mockResolvedValue(mockSalaries);

      render(<SalaryHistoryModal employee={mockEmployee} onClose={vi.fn()} />);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('EMP-00001')).toBeInTheDocument();
      expect(screen.getByText('Lead Product Manager')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Promotion')).toBeInTheDocument();
        expect(screen.getByText('Annual Merit Increment')).toBeInTheDocument();
      });
    });

    it('opens and cancels new adjustment form', async () => {
      vi.spyOn(apiService.salary, 'getHistory').mockResolvedValue(mockSalaries);

      render(<SalaryHistoryModal employee={mockEmployee} onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Promotion')).toBeInTheDocument();
      });

      const adjustButton = screen.getByRole('button', { name: /record salary adjustment/i });
      fireEvent.click(adjustButton);

      expect(screen.getByText('Append New Salary Adjustment')).toBeInTheDocument();

      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Append New Salary Adjustment')).not.toBeInTheDocument();
    });
  });

  describe('AddEmployeeModal', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <AddEmployeeModal isOpen={false} onClose={vi.fn()} onEmployeeCreated={vi.fn()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders form and submits new employee data', async () => {
      const handleCreated = vi.fn();
      const handleClose = vi.fn();

      vi.spyOn(apiService.employee, 'create').mockResolvedValue(mockEmployee);

      render(
        <AddEmployeeModal
          isOpen={true}
          onClose={handleClose}
          onEmployeeCreated={handleCreated}
        />
      );

      expect(screen.getByText('Register New Employee')).toBeInTheDocument();

      const codeInput = screen.getByPlaceholderText(/e\.g\. EMP-10001/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/corporate email/i);
      const jobTitleInput = screen.getByLabelText(/job title/i);
      const salaryInput = screen.getByLabelText(/starting contract salary/i);

      fireEvent.change(codeInput, { target: { value: 'EMP-99999' } });
      fireEvent.change(firstNameInput, { target: { value: 'Alex' } });
      fireEvent.change(lastNameInput, { target: { value: 'Morgan' } });
      fireEvent.change(emailInput, { target: { value: 'alex.morgan@acme.corp' } });
      fireEvent.change(jobTitleInput, { target: { value: 'HR Specialist' } });
      fireEvent.change(salaryInput, { target: { value: '85000' } });

      const submitButton = screen.getByRole('button', { name: /register employee/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(apiService.employee.create).toHaveBeenCalled();
        expect(handleCreated).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('EditEmployeeModal', () => {
    it('does not render when employee is null', () => {
      const { container } = render(
        <EditEmployeeModal employee={null} onClose={vi.fn()} onEmployeeUpdated={vi.fn()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders prefilled form and submits updated profile', async () => {
      const handleUpdated = vi.fn();
      const handleClose = vi.fn();

      vi.spyOn(apiService.employee, 'update').mockResolvedValue({
        ...mockEmployee,
        job_title: 'Principal Product Manager',
      });

      render(
        <EditEmployeeModal
          employee={mockEmployee}
          onClose={handleClose}
          onEmployeeUpdated={handleUpdated}
        />
      );

      expect(screen.getByText('Edit Employee Profile')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Smith')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lead Product Manager')).toBeInTheDocument();

      const jobTitleInput = screen.getByDisplayValue('Lead Product Manager');
      fireEvent.change(jobTitleInput, { target: { value: 'Principal Product Manager' } });

      const saveBtn = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(apiService.employee.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ job_title: 'Principal Product Manager' })
        );
        expect(handleUpdated).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('DeleteEmployeeDialog', () => {
    it('does not render when employee is null', () => {
      const { container } = render(
        <DeleteEmployeeDialog employee={null} onClose={vi.fn()} onEmployeeDeleted={vi.fn()} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders confirmation warning and calls delete on confirm', async () => {
      const handleDeleted = vi.fn();
      const handleClose = vi.fn();

      vi.spyOn(apiService.employee, 'delete').mockResolvedValue();

      render(
        <DeleteEmployeeDialog
          employee={mockEmployee}
          onClose={handleClose}
          onEmployeeDeleted={handleDeleted}
        />
      );

      expect(screen.getByRole('heading', { name: /delete employee record/i })).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

      const deleteBtn = screen.getByRole('button', { name: /delete employee/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(apiService.employee.delete).toHaveBeenCalledWith(1);
        expect(handleDeleted).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
