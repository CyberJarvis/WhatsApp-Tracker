import { cn } from '@/lib/utils';
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-green-600 text-white hover:bg-green-700 border-transparent',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-transparent',
  outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-700 border-transparent hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
