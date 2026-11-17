import React, { forwardRef } from 'react';

export const controlCls =
  'w-full rounded-control border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-3 outline-none transition-colors hover:border-ink-3 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 disabled:bg-canvas disabled:text-ink-3';

/** Field: label + control + hint/error. Wrap any Input/Select/Textarea. */
export function Field({ label, hint, error, htmlFor, required, className = '', children }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink-2">
          {label}
          {required && <span className="text-danger ms-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', invalid, ...rest }, ref) {
  return <input ref={ref} className={`${controlCls} h-10 ${invalid ? 'border-danger' : ''} ${className}`} {...rest} />;
});

export const Select = forwardRef(function Select({ className = '', children, ...rest }, ref) {
  return (
    <select ref={ref} className={`${controlCls} h-10 pe-8 cursor-pointer ${className}`} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={`${controlCls} py-2.5 leading-relaxed ${className}`} {...rest} />;
});

/** Segmented: small exclusive toggle (filters, tabs, language). options: [{value,label}] */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex p-1 rounded-control bg-canvas border border-line ${className}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 px-3 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
            value === o.value ? 'bg-surface text-brand-700 shadow-card' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
