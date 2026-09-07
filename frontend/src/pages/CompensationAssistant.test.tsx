import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompensationAssistant } from './CompensationAssistant';
import { apiService } from '../services/api.service';
import type { AssistantResponse } from '../types/assistant';

describe('CompensationAssistant Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial state with input, chips, and ask button', () => {
    render(<CompensationAssistant />);

    expect(screen.getByText('AI Compensation Assistant')).toBeInTheDocument();
    expect(screen.getByText('Zero-Hallucination SQL')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
    expect(screen.getByText('How many employees are there?')).toBeInTheDocument();
  });

  it('submits a typed question and displays answer with verified badge', async () => {
    const user = userEvent.setup();
    const mockResponse: AssistantResponse = {
      answer: 'There are 10,000 active employees across the entire company.',
      operation: 'get_employee_count',
      data: { headcount: 10000, department: null, country: null },
      metadata: { based_on: 'Active employee contract records in PostgreSQL' },
    };

    vi.spyOn(apiService.assistant, 'ask').mockResolvedValue(mockResponse);

    render(<CompensationAssistant />);

    const input = screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i);
    await user.type(input, 'How many employees are there?');

    const askButton = screen.getByRole('button', { name: /ask/i });
    await user.click(askButton);

    await waitFor(() => {
      expect(apiService.assistant.ask).toHaveBeenCalledWith('How many employees are there?', 'USD');
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
      expect(screen.getByText('get employee count')).toBeInTheDocument();
      expect(screen.getByText('Active employee contract records in PostgreSQL')).toBeInTheDocument();
    });
  });

  it('executes question on Enter key press', async () => {
    const user = userEvent.setup();
    const mockResponse: AssistantResponse = {
      answer: 'The average salary is $120,229.16 USD.',
      operation: 'get_salary_metrics',
      data: { metric: 'average', amount: 120229.16, currency: 'USD' },
      metadata: { based_on: 'Current active salary records' },
    };

    vi.spyOn(apiService.assistant, 'ask').mockResolvedValue(mockResponse);

    render(<CompensationAssistant />);

    const input = screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i);
    await user.type(input, 'What is the average salary?{enter}');

    await waitFor(() => {
      expect(apiService.assistant.ask).toHaveBeenCalledWith('What is the average salary?', 'USD');
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    });
  });

  it('triggers quick prompt when chip is clicked', async () => {
    const user = userEvent.setup();
    const mockResponse: AssistantResponse = {
      answer: 'There are 10,000 active employees across the entire company.',
      operation: 'get_employee_count',
      data: { headcount: 10000 },
      metadata: { based_on: 'Active employee contract records' },
    };

    vi.spyOn(apiService.assistant, 'ask').mockResolvedValue(mockResponse);

    render(<CompensationAssistant />);

    const promptChip = screen.getByText('How many employees are there?');
    await user.click(promptChip);

    await waitFor(() => {
      expect(apiService.assistant.ask).toHaveBeenCalledWith('How many employees are there?', 'USD');
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    });
  });

  it('renders departmental comparison visualizer', async () => {
    const user = userEvent.setup();
    const mockResponse: AssistantResponse = {
      answer: 'Engineering has an average of $117,411.53 USD compared to Finance with $122,495.06 USD.',
      operation: 'compare_departments',
      data: {
        department_a: { department: 'Engineering', headcount: 1280, average_salary: 117411.53 },
        department_b: { department: 'Finance', headcount: 1213, average_salary: 122495.06 },
        currency: 'USD',
      },
      metadata: { based_on: 'Direct department comparison' },
    };

    vi.spyOn(apiService.assistant, 'ask').mockResolvedValue(mockResponse);

    render(<CompensationAssistant />);

    const input = screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i);
    await user.type(input, 'Compare Engineering and Finance');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('1,280')).toBeInTheDocument();
      expect(screen.getByText('1,213')).toBeInTheDocument();
    });
  });

  it('renders salary range distribution card', async () => {
    const user = userEvent.setup();
    const mockResponse: AssistantResponse = {
      answer: 'There are 2,198 employees earning between $50,000 and $100,000.',
      operation: 'get_salary_range_count',
      data: {
        count: 2198,
        total_workforce: 10000,
        percentage: 22.0,
        min_salary: 50000.0,
        max_salary: 100000.0,
        currency: 'USD',
      },
      metadata: { based_on: 'Salary range query' },
    };

    vi.spyOn(apiService.assistant, 'ask').mockResolvedValue(mockResponse);

    render(<CompensationAssistant />);

    const input = screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i);
    await user.type(input, 'Employees between 50k and 100k');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Workforce Share')).toBeInTheDocument();
      expect(screen.getByText('22% of total workforce')).toBeInTheDocument();
      expect(screen.getAllByText(/2,198/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays error alert when service throws', async () => {
    const user = userEvent.setup();
    vi.spyOn(apiService.assistant, 'ask').mockRejectedValue(new Error('Network connection failed'));

    render(<CompensationAssistant />);

    const input = screen.getByPlaceholderText(/e\.g\. Compare Engineering and Finance/i);
    await user.type(input, 'Test query');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    });
  });
});
