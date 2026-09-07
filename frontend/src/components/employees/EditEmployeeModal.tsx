import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

import type { Employee, EmployeeUpdate } from '../../types/employee';
import { apiService } from '../../services/api.service';

interface EditEmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  onEmployeeUpdated: () => void;
}

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Legal',
];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'United States': 'USD',
  'India': 'INR',
  'Germany': 'EUR',
  'United Kingdom': 'GBP',
  'Canada': 'CAD',
  'Australia': 'AUD',
};

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  onClose,
  onEmployeeUpdated,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [jobTitle, setJobTitle] = useState('');
  const [country, setCountry] = useState('United States');
  const [currency, setCurrency] = useState('USD');
  const [hireDate, setHireDate] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name || '');
      setLastName(employee.last_name || '');
      setEmail(employee.email || '');
      setDepartment(employee.department || DEPARTMENTS[0]);
      setJobTitle(employee.job_title || '');
      setCountry(employee.country || 'United States');
      setCurrency(employee.currency || 'USD');
      setHireDate(employee.hire_date || '');
      setError(null);
    }
  }, [employee]);

  if (!employee) return null;

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const newCurrency = COUNTRY_CURRENCY_MAP[newCountry];
    if (newCurrency) {
      setCurrency(newCurrency);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: EmployeeUpdate = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      department,
      job_title: jobTitle.trim(),
      country,
      currency,
      hire_date: hireDate,
    };

    try {
      await apiService.employee.update(employee.id, payload);
      onEmployeeUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(employee)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit Employee Profile
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, py: 0 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Employee ID / Code"
              size="small"
              value={employee.employee_code}
              disabled
              helperText="Employee ID is immutable"
            />

            <TextField
              label="Corporate Email"
              type="email"
              size="small"
              placeholder="name@acme.corp"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextField
              label="First Name"
              size="small"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />

            <TextField
              label="Last Name"
              size="small"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="edit-dept-label">Department</InputLabel>
              <Select
                labelId="edit-dept-label"
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Job Title"
              size="small"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="edit-country-label">Country</InputLabel>
              <Select
                labelId="edit-country-label"
                label="Country"
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                {Object.keys(COUNTRY_CURRENCY_MAP).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Currency"
              size="small"
              value={currency}
              disabled
              helperText="Auto-assigned based on country"
            />

            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                label="Hire Date"
                type="date"
                size="small"
                fullWidth
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
