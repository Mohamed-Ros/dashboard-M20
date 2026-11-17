import React from 'react';

const TONES = {
  neutral: 'bg-canvas text-ink-2 border-line',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  accent: 'bg-accent-50 text-warning border-accent/30',
  success: 'bg-success-50 text-success border-success/20',
  warning: 'bg-warning-50 text-warning border-warning/20',
  danger: 'bg-danger-50 text-danger border-danger/20',
  info: 'bg-info-50 text-info border-info/20',
};

const DOTS = {
  neutral: 'bg-ink-3', brand: 'bg-brand-700', accent: 'bg-accent', success: 'bg-success',
  warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info',
};

/** Badge: status / label pill. tone: neutral | brand | accent | success | warning | danger | info */
export default function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap ${TONES[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}
