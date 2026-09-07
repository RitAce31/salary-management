import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

import { enterpriseTheme } from './theme';
import { AppLayout } from './components/layout/AppLayout';
import type { NavigationTab } from './components/layout/Sidebar';
import { EmployeeDirectory } from './pages/EmployeeDirectory';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { CompensationAssistant } from './pages/CompensationAssistant';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('directory');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const getHeaderInfo = () => {
    switch (currentTab) {
      case 'directory':
        return {
          title: 'Employee Directory',
          subtitle: 'Manage organizational employee profiles, contract currencies, and immutable salary histories.',
          actions: (
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddOutlinedIcon fontSize="small" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Employee
            </Button>
          ),
        };
      case 'analytics':
        return {
          title: 'Compensation Analytics',
          subtitle: 'Executive payroll metrics, departmental comparisons, and normalized salary distributions.',
          actions: null,
        };
      case 'assistant':
        return {
          title: 'AI Compensation Assistant',
          subtitle: 'Query real-time headcount, compensation metrics, departmental benchmarks, and salary bands using natural language.',
          actions: null,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <ThemeProvider theme={enterpriseTheme}>
      <CssBaseline />
      <AppLayout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        headerActions={headerInfo.actions}
      >
        {currentTab === 'directory' && (
          <EmployeeDirectory
            isAddModalOpen={isAddModalOpen}
            setIsAddModalOpen={setIsAddModalOpen}
          />
        )}
        {currentTab === 'analytics' && <AnalyticsDashboard />}
        {currentTab === 'assistant' && <CompensationAssistant />}
      </AppLayout>
    </ThemeProvider>
  );
}

export default App;
