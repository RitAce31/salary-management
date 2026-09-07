import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import type { Employee } from '../../types/employee';
import { EmployeeRow } from './EmployeeRow';

interface EmployeeTableProps {
  employees: Employee[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectEmployee: (employee: Employee) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  totalCount,
  currentPage,
  pageSize,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onPageSizeChange,
  onSelectEmployee,
}) => {
  const handleChangePage = (_: unknown, newPage: number) => {
    onPageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <Paper elevation={0}>
      <TableContainer>
        <Table size="small" aria-label="employee directory table">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === 'employee_code' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'employee_code'}
                  direction={sortBy === 'employee_code' ? sortOrder : 'asc'}
                  onClick={() => onSort('employee_code')}
                >
                  Employee ID
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'first_name' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'first_name'}
                  direction={sortBy === 'first_name' ? sortOrder : 'asc'}
                  onClick={() => onSort('first_name')}
                >
                  Employee Name
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={sortBy === 'department' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'department'}
                  direction={sortBy === 'department' ? sortOrder : 'asc'}
                  onClick={() => onSort('department')}
                >
                  Department
                </TableSortLabel>
              </TableCell>
              <TableCell>Job Title</TableCell>
              <TableCell sortDirection={sortBy === 'country' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'country'}
                  direction={sortBy === 'country' ? sortOrder : 'asc'}
                  onClick={() => onSort('country')}
                >
                  Country
                </TableSortLabel>
              </TableCell>
              <TableCell>Current Salary</TableCell>
              <TableCell sortDirection={sortBy === 'hire_date' ? sortOrder : false}>
                <TableSortLabel
                  active={sortBy === 'hire_date'}
                  direction={sortBy === 'hire_date' ? sortOrder : 'asc'}
                  onClick={() => onSort('hire_date')}
                >
                  Hire Date
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.map((emp) => (
              <EmployeeRow key={emp.id} employee={emp} onClick={onSelectEmployee} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={currentPage - 1}
        onPageChange={handleChangePage}
        rowsPerPage={pageSize}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
};
