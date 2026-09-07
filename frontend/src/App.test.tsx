import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          items: [],
          total: 0,
          page: 1,
          page_size: 25,
          total_pages: 1,
          reporting_currency: 'USD',
          total_headcount: 0,
          total_payroll: '0.00',
          average_salary: '0.00',
          median_salary: '0.00',
          min_salary: '0.00',
          max_salary: '0.00',
          departments: [],
          countries: [],
          brackets: [],
        }),
    })
  )
);

describe('ACME Enterprise Portal Shell', () => {
  it('renders enterprise brand and navigation sidebar', () => {
    render(<App />);
    expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    expect(screen.getByText('Compensation Portal')).toBeInTheDocument();
    expect(screen.getAllByText('Employee Directory').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Compensation Analytics')).toBeInTheDocument();
  });

  it('navigates between Employee Directory and Compensation Analytics tabs', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 2, name: 'Employee Directory' })).toBeInTheDocument();
    expect(screen.getByText('Add Employee')).toBeInTheDocument();

    const analyticsNavBtn = screen.getByRole('button', { name: /compensation analytics/i });
    fireEvent.click(analyticsNavBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Compensation Analytics' })).toBeInTheDocument();
  });
});
