import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Badge } from './Badge';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

describe('Common UI Components', () => {
  describe('Badge', () => {
    it('renders label with default neutral variant', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders with success variant', () => {
      render(<Badge variant="success">Promoted</Badge>);
      expect(screen.getByText('Promoted')).toBeInTheDocument();
    });

    it('renders with warning variant', () => {
      render(<Badge variant="warning">Pending</Badge>);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('renders with primary variant', () => {
      render(<Badge variant="primary">Executive</Badge>);
      expect(screen.getByText('Executive')).toBeInTheDocument();
    });
  });

  describe('LoadingState', () => {
    it('renders circular progress and default message', () => {
      render(<LoadingState />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('renders custom message', () => {
      render(<LoadingState message="Fetching employee directory..." />);
      expect(screen.getByText('Fetching employee directory...')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders default empty state message', () => {
      render(<EmptyState />);
      expect(screen.getByText('No records found')).toBeInTheDocument();
      expect(screen.getByText('There are no items matching the selected criteria.')).toBeInTheDocument();
    });

    it('renders custom title, description, and action button', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No employees found"
          description="Try adjusting your filters"
          actionLabel="Clear Filters"
          onAction={handleAction}
        />
      );

      expect(screen.getByText('No employees found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Clear Filters' });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorState', () => {
    it('renders error title and message', () => {
      render(<ErrorState message="Server connection failed" />);
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText('Server connection failed')).toBeInTheDocument();
    });

    it('renders custom title and retry button', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorState
          title="Custom Error"
          message="Could not load records"
          onRetry={handleRetry}
        />
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Could not load records')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      fireEvent.click(retryButton);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });
});
