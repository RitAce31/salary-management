import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';

import type {
  AnalyticsOverview,
  DepartmentMetric,
  CountryMetric,
  SalaryBracket,
} from '../types/analytics';
import { apiService } from '../services/api.service';
import { KPISection } from '../components/analytics/KPISection';
import { SalaryByDepartment } from '../components/analytics/SalaryByDepartment';
import { SalaryByCountry } from '../components/analytics/SalaryByCountry';
import { SalaryDistribution } from '../components/analytics/SalaryDistribution';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];

export const AnalyticsDashboard: React.FC = () => {
  const [currency, setCurrency] = useState('USD');
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [departments, setDepartments] = useState<DepartmentMetric[]>([]);
  const [countries, setCountries] = useState<CountryMetric[]>([]);
  const [brackets, setBrackets] = useState<SalaryBracket[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [overviewData, deptData, countryData, distData] = await Promise.all([
        apiService.analytics.getOverview(currency),
        apiService.analytics.getByDepartment(currency),
        apiService.analytics.getByCountry(currency),
        apiService.analytics.getDistribution(currency),
      ]);

      setOverview(overviewData);
      setDepartments(deptData.departments);
      setCountries(countryData.countries);
      setBrackets(distData.brackets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve analytics data');
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Reporting Currency:
          </Typography>
          <Select
            size="small"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            sx={{ height: 34, fontWeight: 600 }}
            aria-label="Select reporting currency"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="caption" color="text.secondary">
            * Real-time normalization from local contracts via reference rates
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon fontSize="small" />}
          onClick={fetchAnalytics}
        >
          Refresh Data
        </Button>
      </Paper>

      {loading ? (
        <LoadingState message="Aggregating organizational compensation metrics..." minHeight={360} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchAnalytics} />
      ) : overview ? (
        <>
          <KPISection overview={overview} currency={currency} />

          <SalaryByDepartment departments={departments} currency={currency} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 3 }}>
            <SalaryByCountry countries={countries} currency={currency} />
            <SalaryDistribution brackets={brackets} currency={currency} />
          </Box>
        </>
      ) : null}
    </Box>
  );
};
