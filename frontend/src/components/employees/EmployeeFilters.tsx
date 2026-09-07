import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface EmployeeFiltersProps {
  search: string;
  department: string;
  country: string;
  totalCount: number;
  onSearchChange: (val: string) => void;
  onDepartmentChange: (val: string) => void;
  onCountryChange: (val: string) => void;
  onReset: () => void;
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

const COUNTRIES = [
  'United States',
  'India',
  'Germany',
  'United Kingdom',
  'Canada',
  'Australia',
];

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  search,
  department,
  country,
  totalCount,
  onSearchChange,
  onDepartmentChange,
  onCountryChange,
  onReset,
}) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const handleReset = () => {
    setLocalSearch('');
    onReset();
  };

  const hasActiveFilters = Boolean(search || department || country);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flex: 1 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, code..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="dept-filter-label">Department</InputLabel>
          <Select
            labelId="dept-filter-label"
            value={department}
            label="Department"
            onChange={(e) => onDepartmentChange(e.target.value)}
          >
            <MenuItem value="">
              <em>All Departments</em>
            </MenuItem>
            {DEPARTMENTS.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="country-filter-label">Country</InputLabel>
          <Select
            labelId="country-filter-label"
            value={country}
            label="Country"
            onChange={(e) => onCountryChange(e.target.value)}
          >
            <MenuItem value="">
              <em>All Countries</em>
            </MenuItem>
            {COUNTRIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Button
            variant="text"
            size="small"
            color="secondary"
            startIcon={<ClearIcon fontSize="small" />}
            onClick={handleReset}
          >
            Reset Filters
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary">
        Total matching: <strong style={{ color: '#0f172a' }}>{totalCount.toLocaleString()}</strong>
      </Typography>
    </Paper>
  );
};
