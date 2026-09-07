import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { KPISection } from './KPISection';
import { SalaryByDepartment } from './SalaryByDepartment';
import { SalaryByCountry } from './SalaryByCountry';
import { SalaryDistribution } from './SalaryDistribution';
import type {
  AnalyticsOverview,
  DepartmentAnalyticsResponse,
  CountryAnalyticsResponse,
  DistributionAnalyticsResponse,
} from '../../types/analytics';

const mockOverview: AnalyticsOverview = {
  reporting_currency: 'USD',
  total_headcount: 10000,
  total_payroll: '1250000000.00',
  average_salary: '125000.00',
  median_salary: '118000.00',
  min_salary: '45000.00',
  max_salary: '320000.00',
};

const mockDepartmentData: DepartmentAnalyticsResponse = {
  reporting_currency: 'USD',
  departments: [
    {
      department: 'Engineering',
      headcount: 3200,
      total_payroll: '480000000.00',
      average_salary: '150000.00',
      median_salary: '145000.00',
      min_salary: '70000.00',
      max_salary: '300000.00',
    },
  ],
};

const mockCountryData: CountryAnalyticsResponse = {
  reporting_currency: 'USD',
  countries: [
    {
      country: 'United States',
      currency: 'USD',
      headcount: 4500,
      total_payroll: '675000000.00',
      average_salary: '150000.00',
      median_salary: '145000.00',
    },
  ],
};

const mockDistributionData: DistributionAnalyticsResponse = {
  reporting_currency: 'USD',
  brackets: [
    {
      bracket: '< $50k',
      count: 1200,
      percentage: 12.0,
    },
    {
      bracket: '$50k - $100k',
      count: 4800,
      percentage: 48.0,
    },
  ],
};

describe('Analytics Dashboard Components', () => {
  describe('KPISection', () => {
    it('renders headcount and compensation statistics', () => {
      render(<KPISection overview={mockOverview} currency="USD" />);

      expect(screen.getByText('TOTAL HEADCOUNT')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
      expect(screen.getByText('TOTAL ANNUAL SPEND')).toBeInTheDocument();
      expect(screen.getByText('MEAN SALARY')).toBeInTheDocument();
      expect(screen.getByText('MEDIAN SALARY')).toBeInTheDocument();
    });
  });

  describe('SalaryByDepartment', () => {
    it('renders department comparison table with values', () => {
      render(
        <SalaryByDepartment
          departments={mockDepartmentData.departments}
          currency="USD"
        />
      );

      expect(screen.getByText('Compensation by Department')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('3,200')).toBeInTheDocument();
    });
  });

  describe('SalaryByCountry', () => {
    it('renders country geographical breakdown table', () => {
      render(
        <SalaryByCountry
          countries={mockCountryData.countries}
          currency="USD"
        />
      );

      expect(screen.getByText('Regional Breakdown')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('4,500')).toBeInTheDocument();
    });
  });

  describe('SalaryDistribution', () => {
    it('renders salary brackets and headcount bars', () => {
      render(
        <SalaryDistribution
          brackets={mockDistributionData.brackets}
          currency="USD"
        />
      );

      expect(screen.getByText('Salary Distribution Histogram')).toBeInTheDocument();
      expect(screen.getByText('< $50k')).toBeInTheDocument();
      expect(screen.getByText('$50k - $100k')).toBeInTheDocument();
      expect(screen.getByText(/1,200/)).toBeInTheDocument();
      expect(screen.getByText(/4,800/)).toBeInTheDocument();
    });
  });
});
