'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[#7E5BB6] hover:bg-[#6B4D9A] text-white shadow-[0_0_15px_rgba(126,91,182,0.3)]',
  danger:
    'bg-red-600 hover:bg-red-700 text-white',
  ghost:
    'bg-transparent hover:bg-white/10 text-white border border-white/20',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg px-5 py-2.5 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
