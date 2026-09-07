export interface AnalyticsOverview {
  reporting_currency: string;
  total_headcount: number;
  total_payroll: string;
  average_salary: string;
  median_salary: string;
  min_salary: string;
  max_salary: string;
}

export interface DepartmentMetric {
  department: string;
  headcount: number;
  total_payroll: string;
  average_salary: string;
  median_salary: string;
  min_salary: string;
  max_salary: string;
}

export interface DepartmentAnalyticsResponse {
  reporting_currency: string;
  departments: DepartmentMetric[];
}

export interface CountryMetric {
  country: string;
  currency: string;
  headcount: number;
  total_payroll: string;
  average_salary: string;
  median_salary: string;
}

export interface CountryAnalyticsResponse {
  reporting_currency: string;
  countries: CountryMetric[];
}

export interface SalaryBracket {
  bracket: string;
  count: number;
  percentage: number;
}

export interface DistributionAnalyticsResponse {
  reporting_currency: string;
  brackets: SalaryBracket[];
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: string;
  reference_date: string;
}
