import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeDirectory } from './EmployeeDirectory';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { apiService } from '../services/api.service';
import type { PaginatedEmployeesResponse } from '../types/employee';
import type {
  AnalyticsOverview,
  DepartmentAnalyticsResponse,
  CountryAnalyticsResponse,
  DistributionAnalyticsResponse,
} from '../types/analytics';

const mockPaginatedEmployees: PaginatedEmployeesResponse = {
  items: [
    {
      id: 1,
      employee_code: 'EMP-00001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@acme.corp',
      department: 'Engineering',
      job_title: 'Software Engineer',
      country: 'United States',
      currency: 'USD',
      hire_date: '2022-05-10',
      created_at: '2022-05-10T00:00:00Z',
      updated_at: '2022-05-10T00:00:00Z',
      current_salary: {
        id: 1,
        employee_id: 1,
        amount: '120000.00',
        currency: 'USD',
        effective_date: '2022-05-10',
        change_reason: 'Initial Contract',
        created_at: '2022-05-10T00:00:00Z',
      },
    },
  ],
  total: 1,
  page: 1,
  page_size: 25,
  total_pages: 1,
};

const mockOverview: AnalyticsOverview = {
  reporting_currency: 'USD',
  total_headcount: 10000,
  total_payroll: '1200000000.00',
  average_salary: '120000.00',
  median_salary: '115000.00',
  min_salary: '40000.00',
  max_salary: '300000.00',
};

const mockDeptResponse: DepartmentAnalyticsResponse = {
  reporting_currency: 'USD',
  departments: [
    {
      department: 'Engineering',
      headcount: 4000,
      total_payroll: '500000000.00',
      average_salary: '125000.00',
      median_salary: '120000.00',
      min_salary: '50000.00',
      max_salary: '300000.00',
    },
  ],
};

const mockCountryResponse: CountryAnalyticsResponse = {
  reporting_currency: 'USD',
  countries: [
    {
      country: 'United States',
      currency: 'USD',
      headcount: 5000,
      total_payroll: '650000000.00',
      average_salary: '130000.00',
      median_salary: '125000.00',
    },
  ],
};

const mockDistResponse: DistributionAnalyticsResponse = {
  reporting_currency: 'USD',
  brackets: [
    {
      bracket: '$50k - $100k',
      count: 5000,
      percentage: 50.0,
    },
  ],
};

describe('Page Views', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('EmployeeDirectory', () => {
    it('fetches and renders employees in table', async () => {
      vi.spyOn(apiService.employee, 'list').mockResolvedValue(mockPaginatedEmployees);

      render(
        <EmployeeDirectory
          isAddModalOpen={false}
          setIsAddModalOpen={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('EMP-00001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
      });
    });

    it('displays error state when api fails', async () => {
      vi.spyOn(apiService.employee, 'list').mockRejectedValue(new Error('Connection error'));

      render(
        <EmployeeDirectory
          isAddModalOpen={false}
          setIsAddModalOpen={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Connection error')).toBeInTheDocument();
      });
    });
  });

  describe('AnalyticsDashboard', () => {
    it('fetches and renders overview, departments, countries, and distribution', async () => {
      vi.spyOn(apiService.analytics, 'getOverview').mockResolvedValue(mockOverview);
      vi.spyOn(apiService.analytics, 'getByDepartment').mockResolvedValue(mockDeptResponse);
      vi.spyOn(apiService.analytics, 'getByCountry').mockResolvedValue(mockCountryResponse);
      vi.spyOn(apiService.analytics, 'getDistribution').mockResolvedValue(mockDistResponse);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('TOTAL HEADCOUNT')).toBeInTheDocument();
        expect(screen.getByText('10,000')).toBeInTheDocument();
        expect(screen.getByText('Compensation by Department')).toBeInTheDocument();
        expect(screen.getByText('Regional Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Salary Distribution Histogram')).toBeInTheDocument();
      });
    });

    it('renders error state if analytics request fails', async () => {
      vi.spyOn(apiService.analytics, 'getOverview').mockRejectedValue(new Error('Analytics service unavailable'));
      vi.spyOn(apiService.analytics, 'getByDepartment').mockResolvedValue(mockDeptResponse);
      vi.spyOn(apiService.analytics, 'getByCountry').mockResolvedValue(mockCountryResponse);
      vi.spyOn(apiService.analytics, 'getDistribution').mockResolvedValue(mockDistResponse);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics service unavailable')).toBeInTheDocument();
      });
    });
  });
});
