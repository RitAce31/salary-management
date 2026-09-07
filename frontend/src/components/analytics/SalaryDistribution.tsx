import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';

import type { SalaryBracket } from '../../types/analytics';

interface SalaryDistributionProps {
  brackets: SalaryBracket[];
  currency: string;
}

export const SalaryDistribution: React.FC<SalaryDistributionProps> = ({
  brackets,
  currency,
}) => {
  const maxCount = Math.max(...brackets.map((b) => b.count), 1);

  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Salary Distribution Histogram
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Organizational compensation tiers normalized to {currency}
          </Typography>
        }
        sx={{ p: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          {brackets.map((b) => {
            const fillPercent = Math.min(Math.round((b.count / maxCount) * 100), 100);

            return (
              <Box key={b.bracket} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 110, fontWeight: 500 }}>
                  {b.bracket}
                </Typography>

                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={fillPercent}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Box>

                <Typography
                  variant="body2"
                  sx={{ width: 100, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                >
                  {b.count.toLocaleString()} ({b.percentage.toFixed(1)}%)
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};
