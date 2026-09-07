import React, { useState } from 'react';
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
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';

import type { EmployeeCreate } from '../../types/employee';
import { apiService } from '../../services/api.service';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: () => void;
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

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onEmployeeCreated,
}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [jobTitle, setJobTitle] = useState('');
  const [country, setCountry] = useState('United States');
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialSalary, setInitialSalary] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currency = COUNTRY_CURRENCY_MAP[country] || 'USD';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const salaryNum = parseFloat(initialSalary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      setError('Please provide a valid positive initial salary amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload: EmployeeCreate = {
      employee_code: employeeCode.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      department,
      job_title: jobTitle.trim(),
      country,
      currency,
      hire_date: hireDate,
      initial_salary: {
        amount: salaryNum,
        effective_date: hireDate,
        change_reason: 'Starting Salary',
      },
    };

    try {
      await apiService.employee.create(payload);
      onEmployeeCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Register New Employee
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
              placeholder="e.g. EMP-10001"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              required
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

            <FormControl size="small">
              <InputLabel id="add-dept-label">Department</InputLabel>
              <Select
                labelId="add-dept-label"
                value={department}
                label="Department"
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Job Title"
              size="small"
              placeholder="e.g. Senior Software Engineer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
            />

            <FormControl size="small">
              <InputLabel id="add-country-label">Country</InputLabel>
              <Select
                labelId="add-country-label"
                value={country}
                label="Country"
                onChange={(e) => setCountry(e.target.value)}
              >
                {Object.keys(COUNTRY_CURRENCY_MAP).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c} ({COUNTRY_CURRENCY_MAP[c]})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Hire Date"
              type="date"
              size="small"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Box sx={{ gridColumn: 'span 2' }}>
              <TextField
                fullWidth
                label={`Starting Contract Salary (${currency})`}
                type="number"
                size="small"
                value={initialSalary}
                onChange={(e) => setInitialSalary(e.target.value)}
                required
                slotProps={{
                  htmlInput: { min: 1, step: '0.01' },
                }}
                helperText="Initial salary will be locked as the contract starting base."
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} variant="outlined" size="small" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" size="small" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register Employee'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
