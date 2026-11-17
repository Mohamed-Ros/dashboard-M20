import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-warning',
  success: 'bg-success-50 text-success',
  warning: 'bg-warning-50 text-warning',
  danger: 'bg-danger-50 text-danger',
  info: 'bg-info-50 text-info',
};

/**
 * StatCard: one KPI. label, big value, optional hint line, icon, tone. Pass `to` to make it a link.
 */
export default function StatCard({ label, value, hint, icon: Icon, tone = 'brand', to, loading = false }) {
  const inner = (
    <div className="p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="mt-2 h-8 w-24 rounded bg-canvas animate-pulse" />
        ) : (
          <p className="mt-1.5 text-3xl font-semibold text-ink leading-none tabular-nums">{value}</p>
        )}
        {hint && <p className="mt-2 text-xs text-ink-2">{hint}</p>}
      </div>
      {Icon && (
        <span className={`w-10 h-10 shrink-0 rounded-control flex items-center justify-center ${TONES[tone]}`}>
          <Icon size={20} strokeWidth={1.7} />
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Card as={Link} to={to} interactive className="block">
        {inner}
      </Card>
    );
  }
  return <Card>{inner}</Card>;
}
