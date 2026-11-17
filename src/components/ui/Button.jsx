import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-900 shadow-card',
  accent: 'bg-accent text-brand-900 hover:bg-accent-600 font-semibold shadow-card',
  secondary: 'bg-surface text-brand-700 border border-line hover:bg-brand-50 hover:border-brand-100',
  ghost: 'text-ink-2 hover:bg-brand-50 hover:text-brand-700',
  danger: 'bg-danger text-white hover:bg-red-800 shadow-card',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2.5',
};

/**
 * Button: the single action control.
 * variant: primary | accent | secondary | ghost | danger
 * size: sm | md | lg
 * Use `as={Link} to="..."` to render a router link with identical styling.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconEnd: IconEnd,
  loading = false,
  as: Comp = 'button',
  className = '',
  children,
  disabled,
  ...rest
}) {
  const isButton = Comp === 'button';
  return (
    <Comp
      {...(isButton ? { type: rest.type || 'button' } : {})}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-control font-medium transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" /> : Icon && <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.8} />}
      {children}
      {IconEnd && !loading && <IconEnd size={size === 'sm' ? 14 : 16} strokeWidth={1.8} />}
    </Comp>
  );
}
