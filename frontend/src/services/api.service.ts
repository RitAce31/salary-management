import { apiClient, buildUrl } from './apiClient';
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
import type { AssistantRequest, AssistantResponse } from '../types/assistant';

export interface AssistantStreamCallbacks {
  onStatus?: (status: { step: string; message: string; tool?: string; params?: Record<string, any> }) => void;
  onToken?: (token: string) => void;
  onResult?: (result: AssistantResponse) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

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

  assistant: {
    ask: (
      question: string,
      reportingCurrency = 'USD',
      signal?: AbortSignal
    ): Promise<AssistantResponse> => {
      return apiClient.post<AssistantResponse>(
        '/api/ask',
        {
          question,
          reporting_currency: reportingCurrency,
        } as AssistantRequest,
        { signal }
      );
    },

    streamAsk: async (
      question: string,
      reportingCurrency = 'USD',
      callbacks: AssistantStreamCallbacks = {},
      signal?: AbortSignal
    ): Promise<void> => {
      try {
        const streamUrl = buildUrl('/api/ask/stream');
        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            reporting_currency: reportingCurrency,
          }),
          signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Streaming response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            if (!block.trim()) continue;
            const lines = block.split('\n');
            let eventType = 'message';
            let dataStr = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                dataStr = line.replace('data:', '').trim();
              }
            }

            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (eventType === 'status' && callbacks.onStatus) {
                callbacks.onStatus(parsed);
              } else if (eventType === 'token' && callbacks.onToken) {
                callbacks.onToken(parsed.token || '');
              } else if (eventType === 'result' && callbacks.onResult) {
                callbacks.onResult(parsed);
              } else if (eventType === 'done' && callbacks.onDone) {
                callbacks.onDone();
              }
            } catch (parseErr) {
              console.warn('Failed to parse SSE JSON:', parseErr, dataStr);
            }
          }
        }

        if (callbacks.onDone) {
          callbacks.onDone();
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (callbacks.onError) {
          callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        } else {
          throw err;
        }
      }
    },
  },
};

