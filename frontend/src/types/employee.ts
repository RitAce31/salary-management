import type { Salary, SalaryCreate } from './salary';

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  job_title: string;
  country: string;
  currency: string;
  hire_date: string;
  created_at: string;
  updated_at: string;
  current_salary?: Salary | null;
}

export interface EmployeeDetail extends Employee {
  salary_history: Salary[];
}

export interface PaginatedEmployeesResponse {
  items: Employee[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmployeeCreate {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  job_title: string;
  country: string;
  currency: string;
  hire_date: string;
  initial_salary: SalaryCreate;
}

export interface EmployeeFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  department?: string;
  country?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
