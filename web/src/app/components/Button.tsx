'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const styles = {
  primary: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--bg)',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
  },
} as const;

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3 text-base',
} as const;

export function Button({ children, variant = 'primary', size = 'md', className = '', style, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg font-medium ${sizes[size]} ${className}`}
      style={{
        ...styles[variant],
        transition: 'transform 160ms var(--ease-out)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
