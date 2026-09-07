import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import type { Employee } from '../../types/employee';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface EmployeeRowProps {
  employee: Employee;
  onClick: (employee: Employee) => void;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee, onClick }) => {
  const currentSalary = employee.current_salary;

  return (
    <TableRow
      hover
      onClick={() => onClick(employee)}
      sx={{ cursor: 'pointer', '&:hover': { backgroundColor: '#f8fafc' } }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(employee);
        }
      }}
    >
      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>
        {employee.employee_code}
      </TableCell>
      <TableCell>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }} color="text.primary">
            {employee.first_name} {employee.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {employee.email}
          </Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip label={employee.department} size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: '0.72rem' }} />
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {employee.job_title}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">{employee.country}</Typography>
      </TableCell>
      <TableCell sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {currentSalary ? (
          formatCurrency(currentSalary.amount, currentSalary.currency)
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', fontSize: '0.8rem' }}>
        {formatDate(employee.hire_date)}
      </TableCell>
    </TableRow>
  );
};
