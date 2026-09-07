import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';

import type { Employee } from '../../types/employee';
import type { Salary, SalaryCreate } from '../../types/salary';
import { apiService } from '../../services/api.service';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';

interface SalaryHistoryModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSalaryAdded?: () => void;
}

const CHANGE_REASONS = [
  'Annual Merit Increment',
  'Promotion',
  'Market Adjustment',
  'Cost of Living Adjustment',
  'Role Reclassification',
];

export const SalaryHistoryModal: React.FC<SalaryHistoryModalProps> = ({
  employee,
  onClose,
  onSalaryAdded,
}) => {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newEffectiveDate, setNewEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newReason, setNewReason] = useState(CHANGE_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSalaries = React.useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.salary.getHistory(employee.id);
      setSalaries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary history');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (employee) {
      fetchSalaries();
      setShowAddForm(false);
      setFormError(null);
    }
  }, [employee, fetchSalaries]);

  if (!employee) return null;

  const currentSalary = salaries.length > 0 ? salaries[0] : employee.current_salary;

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Please enter a valid salary amount greater than zero.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: SalaryCreate = {
        amount: amountNum,
        effective_date: newEffectiveDate,
        change_reason: newReason,
      };

      await apiService.salary.addAdjustment(employee.id, payload);
      setNewAmount('');
      setShowAddForm(false);
      await fetchSalaries();
      if (onSalaryAdded) {
        onSalaryAdded();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save salary adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(employee)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            EMPLOYEE SALARY PROFILE
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {employee.first_name} {employee.last_name}
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        <Card variant="outlined" sx={{ mb: 2.5, backgroundColor: '#f8fafc' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">EMPLOYEE ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.employee_code}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">DEPARTMENT</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.department}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">JOB TITLE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.job_title}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">COUNTRY / CURRENCY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{employee.country} ({employee.currency})</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">HIRE DATE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatDate(employee.hire_date)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">CURRENT ACTIVE SALARY</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }} color="primary.main">
                  {currentSalary ? formatCurrency(currentSalary.amount, currentSalary.currency) : '—'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle2" color="text.primary">
            Salary History ({salaries.length} records)
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : 'Record Salary Adjustment'}
          </Button>
        </Box>

        {showAddForm && (
          <Paper component="form" onSubmit={handleCreateAdjustment} variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#ffffff' }}>
            <Typography variant="subtitle2" color="primary.main" gutterBottom>
              Append New Salary Adjustment
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>
                {formError}
              </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <TextField
                label={`Amount (${employee.currency})`}
                type="number"
                size="small"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                required
                slotProps={{ htmlInput: { min: 1, step: '0.01' } }}
              />
              <TextField
                label="Effective Date"
                type="date"
                size="small"
                value={newEffectiveDate}
                onChange={(e) => setNewEffectiveDate(e.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
              <InputLabel id="reason-select-label">Change Reason</InputLabel>
              <Select
                labelId="reason-select-label"
                value={newReason}
                label="Change Reason"
                onChange={(e) => setNewReason(e.target.value)}
              >
                {CHANGE_REASONS.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" variant="text" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="small" variant="contained" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Adjustment'}
              </Button>
            </Box>
          </Paper>
        )}

        {loading ? (
          <LoadingState message="Fetching salary records..." minHeight={160} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchSalaries} />
        ) : salaries.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
            No salary records available.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {salaries.map((salary, index) => {
              const isCurrent = index === 0;
              const previousSalary = salaries[index + 1];
              let percentChange: number | null = null;
              if (previousSalary) {
                const currAmt = parseFloat(salary.amount);
                const prevAmt = parseFloat(previousSalary.amount);
                if (prevAmt > 0) {
                  percentChange = ((currAmt - prevAmt) / prevAmt) * 100;
                }
              }

              return (
                <Card
                  key={salary.id}
                  variant="outlined"
                  sx={{
                    borderLeft: isCurrent ? '4px solid #2563eb' : '4px solid #94a3b8',
                    backgroundColor: isCurrent ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(salary.amount, salary.currency)}
                      </Typography>
                      <Chip
                        label={salary.change_reason || 'Adjustment'}
                        size="small"
                        color={isCurrent ? 'primary' : 'default'}
                        variant={isCurrent ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.72rem', height: 22 }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Effective: {formatDate(salary.effective_date)}
                        </Typography>
                      </Box>

                      {percentChange !== null && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          {percentChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          )}
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 600 }}
                            color={percentChange >= 0 ? 'success.main' : 'error.main'}
                          >
                            {percentChange >= 0 ? '+' : ''}
                            {percentChange.toFixed(1)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
