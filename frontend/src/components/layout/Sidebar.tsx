import React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';

export type NavigationTab = 'directory' | 'analytics';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

const DRAWER_WIDTH = 250;

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          borderRight: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            backgroundColor: 'primary.main',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          AC
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            ACME Corp
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Compensation Portal
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box sx={{ p: 1.5, flex: 1 }}>
        <List disablePadding>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={currentTab === 'directory'}
              onClick={() => onSelectTab('directory')}
              sx={{
                borderRadius: 1,
                py: 1,
                px: 1.5,
                '&.Mui-selected': {
                  backgroundColor: '#eff6ff',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                <PeopleAltOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: currentTab === 'directory' ? 600 : 500 }}>
                    Employee Directory
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding>
            <ListItemButton
              selected={currentTab === 'analytics'}
              onClick={() => onSelectTab('analytics')}
              sx={{
                borderRadius: 1,
                py: 1,
                px: 1.5,
                '&.Mui-selected': {
                  backgroundColor: '#eff6ff',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                <BarChartOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: currentTab === 'analytics' ? 600 : 500 }}>
                    Compensation Analytics
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      <Divider />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageOutlinedIcon fontSize="small" color="success" />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            PostgreSQL 17
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          v1.0.0
        </Typography>
      </Box>
    </Drawer>
  );
};
