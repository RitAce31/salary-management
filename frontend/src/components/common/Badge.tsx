import React from 'react';
import Chip from '@mui/material/Chip';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning';
  size?: 'small' | 'medium';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'small',
}) => {
  let color: 'default' | 'primary' | 'success' | 'warning' = 'default';
  if (variant === 'primary') color = 'primary';
  if (variant === 'success') color = 'success';
  if (variant === 'warning') color = 'warning';

  return (
    <Chip
      label={children}
      size={size}
      color={color}
      variant={variant === 'neutral' ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        borderRadius: 1,
        height: 22,
      }}
    />
  );
};
