import React from 'react';
import { Card } from './Card';

/** TableCard: card shell that scrolls horizontally on small screens. */
export function TableCard({ children, className = '' }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

export function Table({ children, className = '' }) {
  return <table className={`w-full text-sm text-start border-collapse ${className}`}>{children}</table>;
}

export function THead({ children }) {
  return <thead>{children}</thead>;
}

export function Th({ children, className = '', align = 'start' }) {
  return (
    <th
      className={`py-3 px-4 bg-canvas border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-2 whitespace-nowrap ${
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className = '', ...rest }) {
  return (
    <tr className={`border-b border-line last:border-b-0 transition-colors hover:bg-brand-50/40 ${className}`} {...rest}>
      {children}
    </tr>
  );
}

export function Td({ children, className = '', align = 'start', mono = false }) {
  return (
    <td
      className={`py-3.5 px-4 text-ink align-middle ${mono ? 'font-mono text-xs' : ''} ${
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start'
      } ${className}`}
    >
      {children}
    </td>
  );
}

/** EmptyState: for empty tables / lists. */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <span className="w-12 h-12 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
          <Icon size={22} strokeWidth={1.6} />
        </span>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-2 mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
