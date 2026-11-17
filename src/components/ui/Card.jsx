import React from 'react';

/** Card: the one surface for every panel. */
export function Card({ as: Comp = 'div', interactive = false, className = '', children, ...rest }) {
  return (
    <Comp
      className={`bg-surface border border-line rounded-card shadow-card ${
        interactive ? 'transition-colors duration-150 hover:border-brand-100 hover:bg-brand-50/40' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/** CardHeader: title (+ optional icon, description, right-aligned action). */
export function CardHeader({ title, description, icon: Icon, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 py-4 border-b border-line ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="mt-0.5 w-8 h-8 shrink-0 rounded-control bg-brand-50 text-brand-700 flex items-center justify-center">
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink leading-snug">{title}</h2>
          {description && <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ className = '', children }) {
  return <div className={`px-5 py-3 border-t border-line bg-canvas/60 rounded-b-card ${className}`}>{children}</div>;
}

export default Card;
