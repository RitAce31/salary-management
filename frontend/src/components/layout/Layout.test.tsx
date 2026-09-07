import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AppLayout } from './AppLayout';

describe('Layout Components', () => {
  describe('Header', () => {
    it('renders title and subtitle', () => {
      render(
        <Header
          title="Employee Directory"
          subtitle="Manage organizational employees"
        />
      );

      expect(screen.getByRole('heading', { level: 2, name: 'Employee Directory' })).toBeInTheDocument();
      expect(screen.getByText('Manage organizational employees')).toBeInTheDocument();
    });

    it('renders custom actions in header', () => {
      render(
        <Header
          title="Analytics"
          actions={<button type="button">Export Data</button>}
        />
      );

      expect(screen.getByRole('button', { name: 'Export Data' })).toBeInTheDocument();
    });
  });

  describe('Sidebar', () => {
    it('renders brand identity and navigation links', () => {
      const handleSelectTab = vi.fn();
      render(<Sidebar currentTab="directory" onSelectTab={handleSelectTab} />);

      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
      expect(screen.getByText('Compensation Portal')).toBeInTheDocument();
      expect(screen.getByText('Employee Directory')).toBeInTheDocument();
      expect(screen.getByText('Compensation Analytics')).toBeInTheDocument();
    });

    it('triggers onSelectTab when navigation tab is clicked', () => {
      const handleSelectTab = vi.fn();
      render(<Sidebar currentTab="directory" onSelectTab={handleSelectTab} />);

      const analyticsButton = screen.getByRole('button', { name: /compensation analytics/i });
      fireEvent.click(analyticsButton);
      expect(handleSelectTab).toHaveBeenCalledWith('analytics');
    });
  });

  describe('AppLayout', () => {
    it('renders sidebar, header, and children inside main area', () => {
      const handleSelectTab = vi.fn();
      render(
        <AppLayout
          currentTab="directory"
          onSelectTab={handleSelectTab}
          title="Test Portal"
          subtitle="Enterprise Portal View"
        >
          <div data-testid="portal-content">Main Body Content</div>
        </AppLayout>
      );

      expect(screen.getByRole('heading', { level: 2, name: 'Test Portal' })).toBeInTheDocument();
      expect(screen.getByTestId('portal-content')).toHaveTextContent('Main Body Content');
      expect(screen.getByText('ACME Corp')).toBeInTheDocument();
    });
  });
});
