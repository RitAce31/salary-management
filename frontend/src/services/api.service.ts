import { apiClient } from './apiClient';
import type {
  Employee,
  EmployeeDetail,
  EmployeeCreate,
  PaginatedEmployeesResponse,
  EmployeeFilterParams,
} from '../types/employee';
import type { Salary, SalaryCreate } from '../types/salary';
import type {
  AnalyticsOverview,
  DepartmentAnalyticsResponse,
  CountryAnalyticsResponse,
  DistributionAnalyticsResponse,
  ExchangeRate,
} from '../types/analytics';

export const apiService = {
  employee: {
    list: (
      params?: EmployeeFilterParams,
      signal?: AbortSignal
    ): Promise<PaginatedEmployeesResponse> => {
      return apiClient.get<PaginatedEmployeesResponse>(
        '/api/employees',
        {
          page: params?.page ?? 1,
          page_size: params?.page_size ?? 25,
          search: params?.search,
          department: params?.department,
          country: params?.country,
          sort_by: params?.sort_by,
          sort_order: params?.sort_order,
        },
        { signal }
      );
    },

    getById: (id: number, signal?: AbortSignal): Promise<EmployeeDetail> => {
      return apiClient.get<EmployeeDetail>(`/api/employees/${id}`, undefined, { signal });
    },

    create: (data: EmployeeCreate, signal?: AbortSignal): Promise<Employee> => {
      return apiClient.post<Employee>('/api/employees', data, { signal });
    },
  },

  salary: {
    getHistory: (employeeId: number, signal?: AbortSignal): Promise<Salary[]> => {
      return apiClient.get<Salary[]>(
        `/api/employees/${employeeId}/salaries`,
        undefined,
        { signal }
      );
    },

    addAdjustment: (
      employeeId: number,
      data: SalaryCreate,
      signal?: AbortSignal
    ): Promise<Salary> => {
      return apiClient.post<Salary>(
        `/api/employees/${employeeId}/salaries`,
        data,
        { signal }
      );
    },
  },

  analytics: {
    getOverview: (
      reportingCurrency = 'USD',
      department?: string,
      country?: string,
      signal?: AbortSignal
    ): Promise<AnalyticsOverview> => {
      return apiClient.get<AnalyticsOverview>(
        '/api/analytics/overview',
        {
          reporting_currency: reportingCurrency,
          department,
          country,
        },
        { signal }
      );
    },

    getByDepartment: (
      reportingCurrency = 'USD',
      country?: string,
      signal?: AbortSignal
    ): Promise<DepartmentAnalyticsResponse> => {
      return apiClient.get<DepartmentAnalyticsResponse>(
        '/api/analytics/by-department',
        {
          reporting_currency: reportingCurrency,
          country,
        },
        { signal }
      );
    },

    getByCountry: (
      reportingCurrency = 'USD',
      department?: string,
      signal?: AbortSignal
    ): Promise<CountryAnalyticsResponse> => {
      return apiClient.get<CountryAnalyticsResponse>(
        '/api/analytics/by-country',
        {
          reporting_currency: reportingCurrency,
          department,
        },
        { signal }
      );
    },

    getDistribution: (
      reportingCurrency = 'USD',
      department?: string,
      country?: string,
      signal?: AbortSignal
    ): Promise<DistributionAnalyticsResponse> => {
      return apiClient.get<DistributionAnalyticsResponse>(
        '/api/analytics/distribution',
        {
          reporting_currency: reportingCurrency,
          department,
          country,
        },
        { signal }
      );
    },

    getExchangeRates: (signal?: AbortSignal): Promise<ExchangeRate[]> => {
      return apiClient.get<ExchangeRate[]>(
        '/api/analytics/exchange-rates',
        undefined,
        { signal }
      );
    },
  },
};
