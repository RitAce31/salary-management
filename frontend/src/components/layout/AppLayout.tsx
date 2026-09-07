import React from 'react';
import Box from '@mui/material/Box';
import { Sidebar } from './Sidebar';
import type { NavigationTab } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  title,
  subtitle,
  headerActions,
  children,
}) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header title={title} subtitle={subtitle} actions={headerActions} />
        <Box sx={{ p: 3, flex: 1, width: '100%', maxWidth: 1400, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
