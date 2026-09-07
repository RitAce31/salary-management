import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';

import type { DepartmentMetric } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface SalaryByDepartmentProps {
  departments: DepartmentMetric[];
  currency: string;
}

export const SalaryByDepartment: React.FC<SalaryByDepartmentProps> = ({
  departments,
  currency,
}) => {
  const maxAvgSalary = Math.max(
    ...departments.map((d) => parseFloat(d.average_salary) || 0),
    1
  );

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Compensation by Department
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Total spend, headcount distribution, and average comp normalized to {currency}
          </Typography>
        }
        sx={{ p: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
      />
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <TableContainer>
          <Table size="small" aria-label="department compensation table">
            <TableHead>
              <TableRow>
                <TableCell>Department</TableCell>
                <TableCell align="right">Headcount</TableCell>
                <TableCell align="right">Total Annual Spend</TableCell>
                <TableCell align="right">Average Salary</TableCell>
                <TableCell align="right">Median Salary</TableCell>
                <TableCell sx={{ minWidth: 140 }}>Relative Comp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.map((d) => {
                const avgNum = parseFloat(d.average_salary) || 0;
                const barPercent = Math.min(Math.round((avgNum / maxAvgSalary) * 100), 100);

                return (
                  <TableRow key={d.department} hover>
                    <TableCell>
                      <Chip
                        label={d.department}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {d.headcount.toLocaleString()}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {formatCurrency(d.total_payroll, currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(d.average_salary, currency)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(d.median_salary, currency)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={barPercent}
                            sx={{ height: 6, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                          {barPercent}%
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
