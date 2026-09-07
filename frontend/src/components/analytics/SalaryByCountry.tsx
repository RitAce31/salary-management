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
import Chip from '@mui/material/Chip';

import type { CountryMetric } from '../../types/analytics';
import { formatCurrency } from '../../utils/formatters';

interface SalaryByCountryProps {
  countries: CountryMetric[];
  currency: string;
}

export const SalaryByCountry: React.FC<SalaryByCountryProps> = ({
  countries,
  currency,
}) => {
  return (
    <Card variant="outlined">
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Regional Breakdown
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Workforce distribution by country and contract payroll normalized to {currency}
          </Typography>
        }
        sx={{ p: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
      />
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <TableContainer>
          <Table size="small" aria-label="country breakdown table">
            <TableHead>
              <TableRow>
                <TableCell>Country</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell align="right">Headcount</TableCell>
                <TableCell align="right">Total Spend</TableCell>
                <TableCell align="right">Average Comp</TableCell>
                <TableCell align="right">Median Comp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {countries.map((c) => (
                <TableRow key={c.country} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.country}</TableCell>
                  <TableCell>
                    <Chip label={c.currency} size="small" color="primary" sx={{ borderRadius: 1, height: 22, fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {c.headcount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatCurrency(c.total_payroll, currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(c.average_salary, currency)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(c.median_salary, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
