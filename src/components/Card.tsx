import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-[rgba(155,118,212,0.35)] bg-[rgba(27,19,38,0.55)] p-6 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
