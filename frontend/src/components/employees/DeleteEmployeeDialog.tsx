import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

import type { Employee } from '../../types/employee';
import { apiService } from '../../services/api.service';

interface DeleteEmployeeDialogProps {
  employee: Employee | null;
  onClose: () => void;
  onEmployeeDeleted: () => void;
}

export const DeleteEmployeeDialog: React.FC<DeleteEmployeeDialogProps> = ({
  employee,
  onClose,
  onEmployeeDeleted,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!employee) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await apiService.employee.delete(employee.id);
      onEmployeeDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(employee)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
          }}
        >
          <WarningAmberOutlinedIcon fontSize="small" />
        </Box>
        <Box component="span" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          Delete Employee Record
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, py: 0 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Are you sure you want to delete{' '}
          <Box component="strong" sx={{ color: 'text.primary' }}>
            {employee.first_name} {employee.last_name}
          </Box>{' '}
          ({employee.employee_code})?
        </Typography>

        <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }}>
          This will permanently purge this employee along with all associated historical salary adjustment records. This action cannot be undone.
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 2.5 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={submitting}
        >
          {submitting ? 'Deleting...' : 'Delete Employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
