import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import NorthEastOutlinedIcon from '@mui/icons-material/NorthEastOutlined';

import type { AnalyticsOverview } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface KPISectionProps {
  overview: AnalyticsOverview;
  currency: string;
}

export const KPISection: React.FC<KPISectionProps> = ({ overview, currency }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 2,
        mb: 3,
      }}
    >
      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              TOTAL HEADCOUNT
            </Typography>
            <PeopleAltOutlinedIcon fontSize="small" color="primary" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {overview.total_headcount.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Active contracted employees
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              TOTAL ANNUAL SPEND
            </Typography>
            <AttachMoneyOutlinedIcon fontSize="small" color="success" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(overview.total_payroll, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Normalized annual payroll
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              MEDIAN SALARY
            </Typography>
            <BalanceOutlinedIcon fontSize="small" color="primary" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(overview.median_salary, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            50th percentile compensation
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              MEAN SALARY
            </Typography>
            <AssessmentOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(overview.average_salary, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Organizational average
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.04em' }}>
              HIGHEST COMPENSATION
            </Typography>
            <NorthEastOutlinedIcon fontSize="small" color="warning" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(overview.max_salary, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Floor: {formatCurrency(overview.min_salary, currency)}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
