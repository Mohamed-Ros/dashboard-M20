import React from 'react';

/**
 * PageHeader: the standard top of every page.
 * title + optional badge/description on the start side, actions on the end side.
 */
export default function PageHeader({ title, description, badge, actions, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-ink leading-tight">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-sm text-ink-2 mt-1.5 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}
