import React from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import type { Employee } from '../../types/employee';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface EmployeeRowProps {
  employee: Employee;
  onClick: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  onClick,
  onEdit,
  onDelete,
}) => {
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
      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
        {onEdit && (
          <Tooltip title="Edit Employee Profile">
            <IconButton
              size="small"
              aria-label={`edit ${employee.first_name} ${employee.last_name}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
              sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Delete Employee">
            <IconButton
              size="small"
              aria-label={`delete ${employee.first_name} ${employee.last_name}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(employee);
              }}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
};
