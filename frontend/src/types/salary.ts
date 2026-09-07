export interface Salary {
  id: number;
  employee_id: number;
  amount: string;
  currency: string;
  effective_date: string;
  change_reason?: string | null;
  created_at: string;
}

export interface SalaryCreate {
  amount: number;
  effective_date: string;
  change_reason?: string;
}
