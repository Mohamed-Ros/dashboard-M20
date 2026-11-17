import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronRight, ChevronLeft, ExternalLink } from 'lucide-react';
import { findActiveItem } from '../../config/navigation';
import { useLanguage } from '../../context/LanguageContext';
import { Segmented } from '../ui';

/** Topbar: menu button (mobile), breadcrumb from the nav config, connection state, language. */
export default function Topbar({ onOpenMenu }) {
  const { pathname } = useLocation();
  const { t, lang, setLang, isRTL } = useLanguage();
  const active = findActiveItem(pathname);
  const Sep = isRTL ? ChevronLeft : ChevronRight;

  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <header className="h-16 shrink-0 bg-surface border-b border-line flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          className="lg:hidden w-10 h-10 -ms-2 flex items-center justify-center rounded-control text-ink-2 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
          <Link to="/" className="text-ink-3 hover:text-brand-700 transition-colors hidden sm:inline">
            {t('nav.dashboardTitle', 'M20 Operations')}
          </Link>
          {active && (
            <>
              <Sep size={14} className="text-ink-3 hidden sm:inline shrink-0" />
              <span className="text-ink-3 hidden md:inline whitespace-nowrap">{active.group.label[lang] || active.group.label.en}</span>
              <Sep size={14} className="text-ink-3 hidden md:inline shrink-0" />
              <span className="font-semibold text-ink truncate">{t(active.key, active.fallback)}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`hidden sm:inline-flex items-center gap-2 text-xs font-medium ${online ? 'text-success' : 'text-danger'}`}
          role="status"
        >
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-success' : 'bg-danger'}`} />
          {online ? t('nav.serverOnline', 'Online') : lang === 'ar' ? 'غير متصل' : 'Offline'}
        </span>

        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-control border border-line text-xs font-medium text-ink-2 hover:bg-brand-50 hover:text-brand-700 transition-colors"
        >
          <ExternalLink size={13} />
          {lang === 'ar' ? 'المتجر' : 'View store'}
        </a>

        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: 'en', label: 'EN' },
            { value: 'ar', label: 'AR' },
          ]}
        />
      </div>
    </header>
  );
}
